import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { minimalLedgerProjection, projectLedger, type LedgerProjection } from "../axls/projector.js";
import { renderProtectedContextCapsule } from "../compaction/capsule.js";
import { redactSecrets } from "../compaction/capsule.js";
import { renderDynovoCompactionPrompt } from "../compaction/prompt.js";
import type { ProtectedCheckpoint } from "../compaction/types.js";
import { resolveConfig, type DynovoContextConfig } from "../config.js";
import { resolveRole } from "../orchestration/roles.js";
import { resolveActiveObligations } from "../rule-resolver.js";
import { atomicWrite, SessionRegistry, withLock } from "../session-registry.js";

type CompactionOutput = { context: string[]; prompt?: string };
type CompactionEvent = { type: string; properties?: { sessionID?: string } };
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

export class OpenCodeAdapter {
  readonly hooks: {
    "experimental.session.compacting": (input: { sessionID: string }, output: CompactionOutput) => Promise<void>;
    "chat.message": (input: { sessionID: string }, output: ChatOutput) => Promise<void>;
    event: (input: { event: CompactionEvent }) => Promise<void>;
  };
  private readonly prepared = new Map<string, PreparedCheckpoint>();
  private readonly recovery = new Map<string, RecoveryState>();
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
    this.hooks = { "experimental.session.compacting": this.compacting.bind(this), "chat.message": this.chatMessage.bind(this), event: this.event.bind(this) };
  }

  pendingRecovery(sessionID: string): RecoveryState | undefined { return this.recovery.get(sessionID); }
  private checkpointID(sessionID: string): string { return `chk_${createHash("sha256").update(`${sessionID}\0${this.options.worktree}`).digest("hex").slice(0, 16)}`; }
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
      const id = this.checkpointID(sessionID);
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

  private async event(input: { event: CompactionEvent }): Promise<void> {
    if (input.event.type !== "session.compacted") return;
    const sessionID = input.event.properties?.sessionID;
    if (!sessionID || this.recovery.has(sessionID)) return;
    const prepared = this.prepared.get(sessionID);
    if (prepared) {
      const state = await this.registry.get(sessionID);
      const record = JSON.parse(await readFile(prepared.checkpointPath, "utf8")) as Record<string, unknown>;
      await atomicWrite(prepared.checkpointPath, `${JSON.stringify({ ...record, status: "successful" }, null, 2)}\n`);
      try {
        const projection = projectLedger(await readFile(prepared.ledgerPath, "utf8"));
        projection.document.appendRecord("LOG", `checkpoint_${prepared.id}_success`, { event: "compaction_checkpoint_success", checkpoint_id: prepared.id, status: "successful" });
        projection.document.appendRecord("CHECKPOINTS", `${prepared.id}_success`, { checkpoint_id: prepared.id, session_id: sessionID, ledger_revision: projection.ledgerVersion, ruleset_commit: state?.rulesetCommit ?? "UNKNOWN", active_agent_role: state?.activeAgentRole ?? "UNKNOWN", current_plan_id: state?.currentPlanID ?? "NONE", capsule_digest: String(record.capsule_digest ?? "UNKNOWN"), created_at: new Date().toISOString(), status: "successful" });
        await atomicWrite(prepared.ledgerPath, projection.document.serialize());
      } catch (error) { this.options.onDiagnostic?.(`Dynovo context plugin: could not append recovery log (${error instanceof Error ? error.message : "UNKNOWN"}).`); }
    }
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
}

export async function createOpenCodeAdapter(options: AdapterOptions): Promise<OpenCodeAdapter> { return new OpenCodeAdapter(options); }
