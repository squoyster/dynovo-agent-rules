import { createHash } from "node:crypto";
import { join } from "node:path";
import { renderProtectedContextCapsule } from "../compaction/capsule.js";
import { renderDynovoCompactionPrompt } from "../compaction/prompt.js";
import type { ProtectedCheckpoint } from "../compaction/types.js";
import { resolveConfig, type DynovoContextConfig } from "../config.js";
import { atomicWrite, SessionRegistry } from "../session-registry.js";
import { resolveRole } from "../orchestration/roles.js";

type CompactionOutput = { context: string[]; prompt?: string };
type CompactionEvent = { type: string; properties?: { sessionID?: string } };

export interface AdapterOptions {
  directory: string;
  worktree: string;
  rulesetRoot?: string;
  config?: Partial<DynovoContextConfig>;
  observe?: (event: string) => void;
}

interface PreparedCheckpoint { id: string; capsule: string; createdAt: string }
interface RecoveryState { deliveries: number; instruction: string }

const recoveryInstruction = `Dynovo context recovery:
1. Reload the canonical root AGENTS.md.
2. Reload the base AXL-R rules.
3. Reload the listed active overlays.
4. Read the active AXL-S ledger.
5. Verify the active agent role, current plan item, gate, constraints, and next action.
6. Treat the compaction summary as advisory.
7. Canonical files, Git state, and executable evidence override the summary.
8. Do not resume edits until recovery references have been validated.`;

export class OpenCodeAdapter {
  readonly hooks: {
    "experimental.session.compacting": (input: { sessionID: string }, output: CompactionOutput) => Promise<void>;
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
    this.hooks = {
      "experimental.session.compacting": this.compacting.bind(this),
      event: this.event.bind(this),
    };
  }

  pendingRecovery(sessionID: string): RecoveryState | undefined {
    return this.recovery.get(sessionID);
  }

  private checkpointID(sessionID: string): string {
    return `chk_${createHash("sha256").update(`${sessionID}\0${this.options.worktree}`).digest("hex").slice(0, 16)}`;
  }

  private async prepare(sessionID: string): Promise<PreparedCheckpoint> {
    const cached = this.prepared.get(sessionID);
    if (cached) return cached;
    const existing = await this.registry.get(sessionID);
    const role = resolveRole(existing?.activeAgentRole ?? "coordinator");
    const createdAt = new Date().toISOString();
    const id = this.checkpointID(sessionID);
    const capsuleModel: ProtectedCheckpoint = {
      sessionID, checkpointID: id, createdAt, workspaceRoot: this.options.worktree,
      rulesetRoot: this.config.rulesetRoot!, rulesetCommit: existing?.rulesetCommit ?? "UNKNOWN",
      baseRules: this.config.baseRules, activeOverlays: existing?.activeOverlays ?? ["rules/context.axlr"],
      ledgerPath: existing?.ledgerPath ?? "UNKNOWN", ledgerVersion: "UNKNOWN",
      activeRole: role.role, activeAgentID: existing?.activeAgentID ?? "UNKNOWN",
      delegationParent: existing?.delegationParent ?? "NONE", delegatedTask: existing?.delegatedTaskID ?? "NONE",
      allowedActions: role.allowed, forbiddenActions: role.forbidden,
      objective: "UNKNOWN", status: "TODO", risk: "LOW", currentFocus: "UNKNOWN", currentPlanID: existing?.currentPlanID ?? "NONE", currentGate: existing?.currentGate ?? "NONE", nextAction: "Reload canonical state before acting",
      constraints: [], acceptanceCriteria: [], obligations: [], plan: [], files: [], decisions: [], rejectedApproaches: [], failures: [], verification: [], openQuestions: [], redactions: 0,
    };
    const capsule = renderProtectedContextCapsule(capsuleModel, this.config.capsule);
    const digest = createHash("sha256").update(capsule).digest("hex");
    const checkpointDir = join(this.options.worktree, this.config.stateDirectory, "checkpoints", sessionID);
    await atomicWrite(join(checkpointDir, `${id}.capsule`), capsule);
    await atomicWrite(join(checkpointDir, `${id}.json"`.replace('"', "")), `${JSON.stringify({ checkpoint_id: id, session_id: sessionID, capsule_digest: digest, created_at: createdAt, status: "prepared" }, null, 2)}\n`);
    await atomicWrite(join(checkpointDir, "latest"), `${id}\n`);
    await this.registry.put({
      sessionID, workspaceRoot: this.options.worktree, repositoryRoot: this.options.directory, activeAgentRole: role.role,
      activeAgentID: existing?.activeAgentID, delegationParent: existing?.delegationParent, delegatedTaskID: existing?.delegatedTaskID,
      ledgerPath: existing?.ledgerPath, rulesetRoot: this.config.rulesetRoot!, rulesetCommit: existing?.rulesetCommit,
      activeOverlays: capsuleModel.activeOverlays, currentPlanID: existing?.currentPlanID, currentGate: existing?.currentGate,
      lastCheckpointID: id, lastCheckpointAt: createdAt, recoveryDelivered: false,
    });
    const prepared = { id, capsule, createdAt };
    this.prepared.set(sessionID, prepared);
    this.options.observe?.("capsule-persisted");
    return prepared;
  }

  private async compacting(input: { sessionID: string }, output: CompactionOutput): Promise<void> {
    try {
      const checkpoint = await this.prepare(input.sessionID);
      output.context.push(checkpoint.capsule);
      if (this.config.injectCustomPrompt) output.prompt = renderDynovoCompactionPrompt();
      this.options.observe?.("context-injected");
    } catch {
      output.context.push("DYNOVO_PROTECTED_CONTEXT_V1\n[WARNING]\ncheckpoint_status=FAILED\ncanonical_authority=AXL-R,AXL-S,repository,git,tests");
      if (this.config.injectCustomPrompt) output.prompt = renderDynovoCompactionPrompt();
    }
  }

  private async event(input: { event: CompactionEvent }): Promise<void> {
    if (input.event.type !== "session.compacted") return;
    const sessionID = input.event.properties?.sessionID;
    if (!sessionID || this.recovery.has(sessionID)) return;
    this.recovery.set(sessionID, { deliveries: 1, instruction: recoveryInstruction });
    const state = await this.registry.get(sessionID);
    if (state) await this.registry.put({ ...state, recoveryDelivered: true });
  }
}

export async function createOpenCodeAdapter(options: AdapterOptions): Promise<OpenCodeAdapter> {
  return new OpenCodeAdapter(options);
}
