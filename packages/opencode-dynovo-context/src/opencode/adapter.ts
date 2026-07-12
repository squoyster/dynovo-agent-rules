import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Event } from "@opencode-ai/sdk";
import { minimalLedgerProjection, projectLedger, type LedgerProjection } from "../axls/projector.js";
import { renderProtectedContextCapsule } from "../compaction/capsule.js";
import { redactSecrets } from "../compaction/capsule.js";
import { renderDynovoCompactionPrompt } from "../compaction/prompt.js";
import type { ProtectedCheckpoint } from "../compaction/types.js";
import { resolveConfig, type DynovoContextConfig } from "../config.js";
import { resolveRole } from "../orchestration/roles.js";
import { dispatchRejectionMessage, parseDispatchEnvelope, parseResultEnvelope, resultRejectionMessage, validateDispatch, validateResult, type DispatchContract, type DispatchResult } from "../orchestration/dispatch.js";
import { resolveActiveObligations } from "../rule-resolver.js";
import { atomicWrite, SessionRegistry, withLock } from "../session-registry.js";

type CompactionOutput = { context: string[]; prompt?: string };
type ChatOutput = { parts: unknown[] };

export interface AdapterOptions {
  directory: string;
  worktree: string;
  rulesetRoot?: string;
  config?: Partial<DynovoContextConfig>;
  observe?: (event: string) => void;
  onDiagnostic?: (message: string) => void;
  installedPlugins?: string[];
}

interface PreparedCheckpoint { id: string; capsule: string; createdAt: string; ledgerPath: string; checkpointPath: string }
interface RecoveryState { deliveries: number; instruction: string; injected: boolean }
const MAX_PENDING_DISPATCHES = 256;

const recoveryInstruction = `Dynovo context recovery:
1. Reload the canonical root AGENTS.md.
2. Reload the base AXL-R rules.
3. Reload the listed active overlays.
4. Read the active AXL-S ledger.
5. Verify the active agent role, current plan item, gate, constraints, and next action.
6. Treat the compaction summary as advisory.
7. Canonical files, Git state, and executable evidence override the summary.
8. Do not resume edits until recovery references have been validated.`;

function safeSessionID(sessionID: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(sessionID)) throw new Error("Invalid session ID");
  return sessionID;
}

function workspacePath(root: string, candidate: string): string {
  const absolute = resolve(root, candidate);
  if (relative(root, absolute).startsWith("..") || isAbsolute(relative(root, absolute))) throw new Error("Configured path escapes workspace");
  return absolute;
}

function reconstructedLedger(): string {
  return "@META\nid: reconstructed\nv: UNKNOWN\nkind: axls\n\n@STATE\nobjective: UNKNOWN\nstatus: TODO\nrisk: LOW\ncurrent_focus: UNKNOWN\ncurrent_gate: NONE\nnext_action: Reload canonical state before acting\n\n@PLAN\n\n@LOG\n";
}

function dispatchStorageKey(sessionID: string, callID: string): string {
  return createHash("sha256").update(`${sessionID}\0${callID}`).digest("hex").slice(0, 20);
}

function jsonArray(value: string | undefined): unknown[] {
  if (!value) return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

export class OpenCodeAdapter {
  readonly hooks: {
    "experimental.session.compacting": (input: { sessionID: string }, output: CompactionOutput) => Promise<void>;
    "chat.message": (input: { sessionID: string }, output: ChatOutput) => Promise<void>;
    "tool.execute.before": (input: { tool: string; sessionID: string; callID: string }, output: { args: Record<string, unknown> }) => Promise<void>;
    "tool.execute.after": (input: { tool: string; sessionID: string; callID: string; args: Record<string, unknown> }, output: { title: string; output: string; metadata: unknown }) => Promise<void>;
    event: (input: { event: Event }) => Promise<void>;
  };
  private readonly prepared = new Map<string, PreparedCheckpoint>();
  private readonly recovery = new Map<string, RecoveryState>();
  private readonly acceptedDispatches = new Map<string, DispatchContract>();
  private readonly registry: SessionRegistry;
  private readonly config: DynovoContextConfig;
  private readonly options: AdapterOptions;

  constructor(options: AdapterOptions) {
    this.options = options;
    this.config = resolveConfig(options.worktree, { ...options.config, rulesetRoot: options.rulesetRoot ?? options.worktree });
    this.registry = new SessionRegistry(options.worktree, this.config.stateDirectory);
    if (this.config.dcpCoexistence && options.installedPlugins?.some((plugin) => plugin.includes("opencode-dcp"))) {
      this.options.onDiagnostic?.("Dynovo context plugin: DCP detected; selective pruning remains delegated to DCP.");
    }
    this.hooks = { "experimental.session.compacting": this.compacting.bind(this), "chat.message": this.chatMessage.bind(this), "tool.execute.before": this.beforeToolExecute.bind(this), "tool.execute.after": this.afterToolExecute.bind(this), event: this.event.bind(this) };
  }

  pendingRecovery(sessionID: string): RecoveryState | undefined { return this.recovery.get(sessionID); }
  /** A prepared checkpoint is deduplicated only until its matching compaction event. */
  private checkpointID(): string { return `chk_${randomUUID().replaceAll("-", "")}`; }
  private checkpointDirectory(sessionID: string): string { return join(this.options.worktree, this.config.stateDirectory, "checkpoints", safeSessionID(sessionID)); }

  private async loadLedger(sessionID: string): Promise<{ path: string; projection: LedgerProjection }> {
    const registered = await this.registry.get(sessionID);
    const configured = this.config.activeLedger === "auto" ? registered?.ledgerPath : this.config.activeLedger;
    const path = configured ? workspacePath(this.options.worktree, configured) : join(this.options.worktree, this.config.stateDirectory, "state", "tasks", `${safeSessionID(sessionID)}.axls`);
    try { return { path, projection: projectLedger(await readFile(path, "utf8")) }; }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && this.config.failurePolicy.missingLedger === "reconstruct-minimal") {
        const source = reconstructedLedger();
        await atomicWrite(path, source);
        return { path, projection: projectLedger(source) };
      }
      if (this.config.failurePolicy.invalidLedger === "inject-raw-and-warn") {
        this.options.onDiagnostic?.(`Dynovo context plugin: ledger unavailable (${error instanceof Error ? error.message : "UNKNOWN"}); using minimal projection.`);
        const projection = minimalLedgerProjection();
        projection.warnings.push({ id: "ledger_invalid", text: `INVALID_LEDGER: ${path}` });
        return { path, projection };
      }
      throw error;
    }
  }

  private async prepare(sessionID: string): Promise<PreparedCheckpoint> {
    safeSessionID(sessionID);
    const checkpointDir = this.checkpointDirectory(sessionID);
    return withLock(join(checkpointDir, "transaction"), async () => {
      const cached = this.prepared.get(sessionID);
      if (cached) return cached;
      const existing = await this.registry.get(sessionID);
      const { path: ledgerPath, projection } = await this.loadLedger(sessionID);
      const role = resolveRole(existing?.activeAgentRole ?? "coordinator");
      if (role.role === "UNKNOWN" && this.config.failurePolicy.unknownAgent === "warn") {
        projection.warnings.push({ id: "agent_unknown", text: "UNKNOWN_AGENT_ROLE: permissions are not inferred" });
      }
      const activeOverlays = existing?.activeOverlays ?? [this.config.baseRules, "rules/context.axlr"];
      let obligations: ProtectedCheckpoint["obligations"] = [];
      try { obligations = await resolveActiveObligations(this.config.rulesetRoot!, activeOverlays, role.role, { pre_compaction: true, context_pressure_high: true }, existing?.rulesetCommit ?? "UNKNOWN"); }
      catch (error) {
        const detail = error instanceof Error ? error.message : "UNKNOWN";
        this.options.onDiagnostic?.(`Dynovo context plugin: ruleset unavailable (${detail}).`);
        if (this.config.failurePolicy.missingRuleset === "reference-known-state") {
          projection.warnings.push({ id: "ruleset_unavailable", text: `RULESET_UNAVAILABLE: ${this.config.rulesetRoot}` });
        }
      }
      const createdAt = new Date().toISOString();
      const id = this.checkpointID();
      const capsuleModel: ProtectedCheckpoint = {
        sessionID, checkpointID: id, createdAt, workspaceRoot: this.options.worktree, rulesetRoot: this.config.rulesetRoot!, rulesetCommit: existing?.rulesetCommit ?? "UNKNOWN", baseRules: this.config.baseRules, activeOverlays,
        ledgerPath, ledgerVersion: projection.ledgerVersion, activeRole: role.role, activeAgentID: existing?.activeAgentID ?? "UNKNOWN", delegationParent: existing?.delegationParent ?? "NONE", delegatedTask: existing?.delegatedTaskID ?? "NONE", allowedActions: role.allowed, forbiddenActions: role.forbidden,
        objective: projection.objective, status: projection.status, risk: projection.risk, currentFocus: projection.currentFocus, currentPlanID: projection.currentPlanID, currentGate: projection.currentGate, nextAction: projection.nextAction,
        constraints: projection.constraints, acceptanceCriteria: projection.acceptanceCriteria, obligations, plan: [...projection.plan, ...projection.delegations], files: [], decisions: projection.decisions, rejectedApproaches: projection.rejectedApproaches, failures: projection.failures, verification: projection.verification, openQuestions: [...projection.openQuestions, ...projection.warnings], redactions: 0,
      };
      const capsule = renderProtectedContextCapsule(capsuleModel, this.config.capsule);
      const digest = createHash("sha256").update(capsule).digest("hex");
      const checkpointPath = join(checkpointDir, `${id}.json`);
      projection.document.appendRecord("LOG", `checkpoint_${id}`, { event: "compaction_checkpoint_prepared", checkpoint_id: id, status: "prepared" });
      projection.document.appendRecord("CHECKPOINTS", id, { checkpoint_id: id, session_id: sessionID, ledger_revision: projection.ledgerVersion, ruleset_commit: capsuleModel.rulesetCommit, active_agent_role: role.role, current_plan_id: projection.currentPlanID, capsule_digest: digest, created_at: createdAt, status: "prepared" });
      await atomicWrite(ledgerPath, projection.document.serialize());
      await atomicWrite(join(checkpointDir, `${id}.capsule`), capsule);
      await atomicWrite(checkpointPath, `${JSON.stringify({ checkpoint_id: id, session_id: sessionID, ledger_revision: projection.ledgerVersion, ruleset_commit: capsuleModel.rulesetCommit, active_agent_role: role.role, current_plan_id: projection.currentPlanID, capsule_digest: digest, created_at: createdAt, status: "prepared" }, null, 2)}\n`);
      await atomicWrite(join(checkpointDir, "latest"), `${id}\n`);
      await this.registry.put({ sessionID, workspaceRoot: this.options.worktree, repositoryRoot: this.options.directory, activeAgentRole: role.role, activeAgentID: existing?.activeAgentID, delegationParent: existing?.delegationParent, delegatedTaskID: existing?.delegatedTaskID, ledgerPath, rulesetRoot: this.config.rulesetRoot!, rulesetCommit: existing?.rulesetCommit, activeOverlays, currentPlanID: projection.currentPlanID, currentGate: projection.currentGate, lastCheckpointID: id, lastCheckpointAt: createdAt, recoveryDelivered: false });
      const prepared = { id, capsule, createdAt, ledgerPath, checkpointPath };
      this.prepared.set(sessionID, prepared);
      this.options.observe?.("capsule-persisted");
      return prepared;
    });
  }

  private async compacting(input: { sessionID: string }, output: CompactionOutput): Promise<void> {
    if (!this.config.enabled || !this.config.checkpointOnCompaction) return;
    try {
      const checkpoint = await this.prepare(input.sessionID);
      output.context.push(checkpoint.capsule);
      if (this.config.injectCustomPrompt) output.prompt = renderDynovoCompactionPrompt();
      this.options.observe?.("context-injected");
    } catch (error) {
      const message = redactSecrets(error instanceof Error ? error.message : "UNKNOWN");
      this.options.onDiagnostic?.(`Dynovo context plugin: checkpoint failed: ${message}`);
      if (this.config.failurePolicy.writeFailure === "abort") throw error;
      output.context.push(`DYNOVO_PROTECTED_CONTEXT_V1\n[WARNING]\ncheckpoint_status=FAILED\nerror=${message}\ncanonical_authority=AXL-R,AXL-S,repository,git,tests`);
      if (this.config.injectCustomPrompt) output.prompt = renderDynovoCompactionPrompt();
    }
  }

  private async event(input: { event: Event }): Promise<void> {
    if (input.event.type !== "session.compacted") return;
    const sessionID = input.event.properties?.sessionID;
    if (!sessionID) return;
    const prepared = this.prepared.get(sessionID);
    // OpenCode may emit a duplicate event. With no currently prepared attempt,
    // it cannot acknowledge a new recovery cycle and is intentionally ignored.
    if (!prepared) return;
    const state = await this.registry.get(sessionID);
    const record = JSON.parse(await readFile(prepared.checkpointPath, "utf8")) as Record<string, unknown>;
    await atomicWrite(prepared.checkpointPath, `${JSON.stringify({ ...record, status: "successful" }, null, 2)}\n`);
    try {
      const projection = projectLedger(await readFile(prepared.ledgerPath, "utf8"));
      projection.document.appendRecord("LOG", `checkpoint_${prepared.id}_success`, { event: "compaction_checkpoint_success", checkpoint_id: prepared.id, status: "successful" });
      projection.document.appendRecord("CHECKPOINTS", `${prepared.id}_success`, { checkpoint_id: prepared.id, session_id: sessionID, ledger_revision: projection.ledgerVersion, ruleset_commit: state?.rulesetCommit ?? "UNKNOWN", active_agent_role: state?.activeAgentRole ?? "UNKNOWN", current_plan_id: state?.currentPlanID ?? "NONE", capsule_digest: String(record.capsule_digest ?? "UNKNOWN"), created_at: new Date().toISOString(), status: "successful" });
      await atomicWrite(prepared.ledgerPath, projection.document.serialize());
    } catch (error) { this.options.onDiagnostic?.(`Dynovo context plugin: could not append recovery log (${error instanceof Error ? error.message : "UNKNOWN"}).`); }
    this.prepared.delete(sessionID);
    this.recovery.set(sessionID, { deliveries: 1, instruction: recoveryInstruction, injected: false });
  }

  private async chatMessage(input: { sessionID: string }, output: ChatOutput): Promise<void> {
    const recovery = this.recovery.get(input.sessionID);
    if (!recovery || recovery.injected || !this.config.postCompactionRecovery) return;
    output.parts.push({ type: "text", text: recovery.instruction });
    recovery.injected = true;
    const state = await this.registry.get(input.sessionID);
    if (state) await this.registry.put({ ...state, recoveryDelivered: true });
  }

  private dispatchStateLock(): string {
    return join(this.options.worktree, this.config.stateDirectory, "state", "dispatches");
  }

  private async persistDispatch(sessionID: string, callID: string, dispatch: DispatchContract): Promise<void> {
    await withLock(this.dispatchStateLock(), async () => {
      const ledger = await this.loadLedger(sessionID);
      const delegations = ledger.projection.document.blocks.get("DELEGATIONS")?.records ?? [];
      const evidence = ledger.projection.document.blocks.get("EVIDENCE")?.records ?? [];
      if (evidence.some((record) => record.fields.session_id === sessionID && record.fields.call_id === callID)) throw new Error("dispatch already recorded");
      const id = `dispatch_${dispatchStorageKey(sessionID, callID)}`;
      if (!delegations.some((record) => record.id === id)) {
        ledger.projection.document.appendRecord("DELEGATIONS", id, {
          dispatch_id: dispatch.task_id, session_id: sessionID, call_id: callID, status: "pending", agent: dispatch.agent, role: dispatch.role,
          current_state: dispatch.current_state, requested_transition: dispatch.requested_transition, mutation_authorized: String(dispatch.mutation_authorized),
          allowed_actions: JSON.stringify(dispatch.allowed_actions), required_evidence: JSON.stringify(dispatch.required_evidence), created_at: new Date().toISOString(),
        });
        ledger.projection.document.appendRecord("LOG", `${id}_accepted`, { event: "dispatch_accepted", dispatch_id: dispatch.task_id, session_id: sessionID, call_id: callID, status: "pending" });
        await atomicWrite(ledger.path, ledger.projection.document.serialize());
      }
    });
  }

  private async recoverDispatch(sessionID: string, callID: string): Promise<DispatchContract | undefined> {
    const ledger = await this.loadLedger(sessionID);
    const evidence = ledger.projection.document.blocks.get("EVIDENCE")?.records ?? [];
    if (evidence.some((record) => record.fields.session_id === sessionID && record.fields.call_id === callID)) return undefined;
    const id = `dispatch_${dispatchStorageKey(sessionID, callID)}`;
    const record = (ledger.projection.document.blocks.get("DELEGATIONS")?.records ?? []).find((item) => item.id === id && item.fields.status === "pending");
    if (!record) return undefined;
    return {
      task_id: record.fields.dispatch_id ?? "UNKNOWN", current_state: record.fields.current_state ?? "UNKNOWN", requested_transition: record.fields.requested_transition ?? "UNKNOWN",
      request_kind: "execute", mutation_authorized: record.fields.mutation_authorized === "true", agent: record.fields.agent ?? "general", role: record.fields.role ?? "UNKNOWN",
      model_tier: "recovered", policy_bundle: ["axl/types.axlt", "rules/base.axlr"], task: "Recovered dispatch", acceptance_criteria: ["Recovered result contract"],
      allowed_actions: jsonArray(record.fields.allowed_actions).filter((item): item is string => typeof item === "string"), forbidden_actions: ["expand recovered scope"],
      required_evidence: jsonArray(record.fields.required_evidence).filter((item): item is string => typeof item === "string"), completion_boundary: "Return the result contract.", assumptions: [], unresolved: [],
    };
  }

  private async persistResult(sessionID: string, callID: string, result?: DispatchResult, rejection?: string): Promise<void> {
    await withLock(this.dispatchStateLock(), async () => {
      const ledger = await this.loadLedger(sessionID);
      const id = `result_${dispatchStorageKey(sessionID, callID)}`;
      const fields: Record<string, string> = result ? {
        dispatch_id: result.dispatch_id, session_id: sessionID, call_id: callID, status: result.status, claimed_transition: result.claimed_transition,
        actions: JSON.stringify(result.actions), changed_files: JSON.stringify(result.changed_files), commands: JSON.stringify(result.commands), exit_codes: JSON.stringify(result.exit_codes),
        evidence: JSON.stringify(result.evidence), blockers: JSON.stringify(result.blockers), scope_changes: JSON.stringify(result.scope_changes), policy_expansion_requested: JSON.stringify(result.policy_expansion_requested), validation: "passed", recorded_at: new Date().toISOString(),
      } : { session_id: sessionID, call_id: callID, status: "REJECTED", validation: rejection ?? "UNKNOWN", recorded_at: new Date().toISOString() };
      ledger.projection.document.appendRecord("EVIDENCE", id, fields);
      ledger.projection.document.appendRecord("LOG", `${id}_recorded`, { event: "dispatch_result_recorded", session_id: sessionID, call_id: callID, status: result?.status ?? "REJECTED", validation: result ? "passed" : rejection ?? "UNKNOWN" });
      await atomicWrite(ledger.path, ledger.projection.document.serialize());
    });
  }

  private async beforeToolExecute(input: { tool: string; sessionID: string; callID: string }, output: { args: Record<string, unknown> }): Promise<void> {
    if (!this.config.enabled || !this.config.orchestrator.enabled || input.tool !== "task") return;
    const parsed = parseDispatchEnvelope(output.args.prompt);
    if (!parsed.ok) throw new Error(dispatchRejectionMessage(parsed.reason));
    const violation = validateDispatch(parsed.dispatch)[0];
    if (violation) throw new Error(dispatchRejectionMessage(violation.code));
    try { await this.persistDispatch(input.sessionID, input.callID, parsed.dispatch); }
    catch (error) { throw new Error(dispatchRejectionMessage(error instanceof Error && error.message === "dispatch already recorded" ? "duplicate_dispatch" : "persistence_failed")); }
    if (this.acceptedDispatches.size >= MAX_PENDING_DISPATCHES) {
      const oldest = this.acceptedDispatches.keys().next().value;
      if (oldest) this.acceptedDispatches.delete(oldest);
      this.options.onDiagnostic?.("Dynovo context plugin: evicted oldest pending dispatch after reaching the in-memory bound.");
    }
    this.acceptedDispatches.set(`${input.sessionID}\0${input.callID}`, parsed.dispatch);
  }

  private async afterToolExecute(input: { tool: string; sessionID: string; callID: string }, output: { output: string }): Promise<void> {
    if (!this.config.enabled || !this.config.orchestrator.enabled || input.tool !== "task") return;
    const key = `${input.sessionID}\0${input.callID}`;
    const dispatch = this.acceptedDispatches.get(key) ?? await this.recoverDispatch(input.sessionID, input.callID);
    this.acceptedDispatches.delete(key);
    if (!dispatch) throw new Error(resultRejectionMessage("missing_accepted_dispatch"));
    const parsed = parseResultEnvelope(output.output);
    if (!parsed.ok) { await this.persistResult(input.sessionID, input.callID, undefined, parsed.reason); throw new Error(resultRejectionMessage(parsed.reason)); }
    const violation = validateResult(parsed.result, dispatch)[0];
    if (violation) { await this.persistResult(input.sessionID, input.callID, undefined, violation.code); throw new Error(resultRejectionMessage(violation.code)); }
    await this.persistResult(input.sessionID, input.callID, parsed.result);
  }
}

export async function createOpenCodeAdapter(options: AdapterOptions): Promise<OpenCodeAdapter> { return new OpenCodeAdapter(options); }
