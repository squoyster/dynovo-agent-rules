import type { CapsuleItem, CapsuleOptions, ProtectedCheckpoint } from "./types.js";

const REDACTED = "<REDACTED:DYNOVO_SECRET>";
const secretPatterns = [
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/gi,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{12,}\b/gi,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)? PRIVATE KEY-----/g,
  /([a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:)[^\s@/]+@/gi,
  /\b(?:authorization|api[_-]?key|password|secret|token)\s*[=:]\s*[^\s,;]+/gi,
  /\b[A-Za-z_][A-Za-z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY)\s*=\s*[^\s]+/gi,
];

export function redactSecrets(value: string): string {
  return secretPatterns.reduce((result, pattern) => result.replace(pattern, (match, prefix) => prefix ? `${prefix}${REDACTED}` : REDACTED), value);
}

function value(input: string | undefined): string {
  return redactSecrets(input || "UNKNOWN");
}

function list(values: string[]): string {
  return values.length ? values.map(value).sort().join(" | ") : "NONE";
}

function lines(items: CapsuleItem[], render: (item: CapsuleItem) => string): string[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id)).map(render);
}

function render(checkpoint: ProtectedCheckpoint, plan: CapsuleItem[], failures = checkpoint.failures): string {
  const out = [
    "DYNOVO_PROTECTED_CONTEXT_V1",
    "[IDENTITY]",
    `session_id=${value(checkpoint.sessionID)}`,
    `checkpoint_id=${value(checkpoint.checkpointID)}`,
    `created_at=${value(checkpoint.createdAt)}`,
    `workspace_root=${value(checkpoint.workspaceRoot)}`,
    `repository=${value(checkpoint.repository)}`,
    "[AUTHORITY]",
    `ruleset_root=${value(checkpoint.rulesetRoot)}`,
    `ruleset_commit=${value(checkpoint.rulesetCommit)}`,
    `base_rules=${value(checkpoint.baseRules)}`,
    `active_overlays=${list(checkpoint.activeOverlays)}`,
    `ledger_path=${value(checkpoint.ledgerPath)}`,
    `ledger_version=${value(checkpoint.ledgerVersion)}`,
    "summary_authority=ADVISORY",
    "canonical_authority=AXL-R,AXL-S,repository,git,tests",
    "[AGENT]",
    `active_role=${value(checkpoint.activeRole)}`,
    `active_agent_id=${value(checkpoint.activeAgentID)}`,
    `delegation_parent=${value(checkpoint.delegationParent)}`,
    `delegated_task=${value(checkpoint.delegatedTask)}`,
    `allowed_actions=${list(checkpoint.allowedActions)}`,
    `forbidden_actions=${list(checkpoint.forbiddenActions)}`,
    "[TASK]",
    `objective=${value(checkpoint.objective)}`,
    `status=${value(checkpoint.status)}`,
    `risk=${value(checkpoint.risk)}`,
    `current_focus=${value(checkpoint.currentFocus)}`,
    `current_plan_id=${value(checkpoint.currentPlanID)}`,
    `current_gate=${value(checkpoint.currentGate)}`,
    `next_action=${value(checkpoint.nextAction)}`,
    "[HARD_CONSTRAINTS]",
    ...lines(checkpoint.constraints, item => `- ${value(item.id)}: ${value(item.text)}`),
    "[ACCEPTANCE_CRITERIA]",
    ...checkpoint.acceptanceCriteria.sort((a, b) => a.id.localeCompare(b.id)).map(item => `- ${value(item.id)}: ${value(item.text)} | status=${value(item.status)} | evidence=${value(item.evidence)}`),
    "[ACTIVE_OBLIGATIONS]",
    ...checkpoint.obligations.sort((a, b) => a.id.localeCompare(b.id)).map(item => `- ${value(item.id)}: ${value(item.text)}`),
    "[PLAN]",
    ...plan.sort((a, b) => a.id.localeCompare(b.id)).map(item => `- ${value(item.id)} | status=${value(item.status)} | owner=${value(item.owner)} | action=${value(item.action)} | evidence=${value(item.evidence)}`),
    "[FILES]",
    ...lines(checkpoint.files, item => `- ${value(item.id)} | purpose=${value(item.text)}`),
    "[DECISIONS]",
    ...lines(checkpoint.decisions, item => `- ${value(item.id)}: ${value(item.text)}`),
    "[REJECTED_APPROACHES]",
    ...lines(checkpoint.rejectedApproaches, item => `- ${value(item.id)}: ${value(item.text)}`),
    "[FAILURES]",
    ...failures.sort((a, b) => a.id.localeCompare(b.id)).flatMap(item => [
      `- ${value(item.id)}`,
      `  command=${value(item.command)}`,
      `  exit_code=${value(item.exitCode)}`,
      `  error=${value(item.error)}`,
      `  hypothesis_status=${value(item.hypothesisStatus)}`,
      `  evidence=${value(item.evidence)}`,
    ]),
    "[VERIFICATION]",
    ...lines(checkpoint.verification, item => `- ${value(item.id)}: ${value(item.text)}`),
    "[OPEN_QUESTIONS]",
    ...lines(checkpoint.openQuestions, item => `- ${value(item.id)}: ${value(item.text)}`),
    "[RECOVERY]",
    "reload_order=AGENTS.md,base_rules,active_overlays,ledger",
    `resume_from=${value(checkpoint.currentPlanID)}`,
    "conflict_policy=canonical_files_override_summary",
  ];
  return out.join("\n");
}

export function renderProtectedContextCapsule(checkpoint: ProtectedCheckpoint, options: CapsuleOptions): string {
  const activePlan = checkpoint.plan.filter(item => item.status !== "DONE");
  const completed = checkpoint.plan.filter(item => item.status === "DONE").slice(0, options.includeCompletedPlanItems ?? 0);
  const fullPlan = [...activePlan, ...completed];
  let result = render(checkpoint, fullPlan);
  if (result.length <= options.maxChars) return result;
  result = render(checkpoint, activePlan);
  if (result.length <= options.maxChars) return result;
  result = render({ ...checkpoint, decisions: [], rejectedApproaches: [], verification: [], files: [], openQuestions: [] }, activePlan);
  if (result.length <= options.maxChars) return result;
  const activeFailures = checkpoint.failures.filter(item => item.hypothesisStatus === "active");
  result = render({ ...checkpoint, decisions: [], rejectedApproaches: [], verification: [], files: [], openQuestions: [] }, activePlan, activeFailures);
  if (result.length <= options.maxChars) return result;
  // Do not cut through required authority, role, constraint, or failure records.
  // If these records alone exceed a caller's limit, preserving canonical recovery
  // state is safer than emitting a syntactically plausible partial capsule.
  return result;
}
