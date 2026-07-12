import { roleCapabilities } from "./roles.js";

export const dispatchEnvelopeMarker = "DYNOVO_DISPATCH_V1";
export const resultEnvelopeMarker = "DYNOVO_RESULT_V1";

const workflowStates = new Set([
  "INTAKE", "DISCOVERY", "SPECIFICATION", "BASELINE_READY", "RED_REQUIRED",
  "RED_ESTABLISHED", "IMPLEMENTATION", "GREEN_ESTABLISHED", "REVIEW",
  "VALIDATION", "INTEGRATION_READY", "COMPLETE", "BLOCKED",
]);
const requestKinds = new Set(["report", "inspect", "research", "plan", "execute", "review", "modify"]);
const resultStatuses = new Set(["PASS", "FAIL", "BLOCKED"]);
const agentRoles: Record<string, readonly string[]> = {
  router: ["coordinator"],
  explore: ["explorer"],
  scout: ["explorer"],
  general: ["test_author", "implementer", "reviewer"],
  "build-m": ["implementer"],
  "build-l": ["implementer"],
  "build-xl": ["implementer"],
  build: ["implementer"],
  plan: ["planner", "reviewer"],
  "plan-l": ["planner"],
  "plan-xl": ["planner"],
};

export interface DispatchContract {
  task_id: string;
  current_state: string;
  requested_transition: string;
  request_kind: string;
  mutation_authorized: boolean;
  agent: string;
  role: string;
  model_tier: string;
  policy_bundle: string[];
  task: string;
  acceptance_criteria: string[];
  allowed_actions: string[];
  forbidden_actions: string[];
  required_evidence: string[];
  completion_boundary: string;
  assumptions: unknown[];
  unresolved: unknown[];
  approved_specification?: boolean;
  red_established?: boolean;
  behavior_change?: boolean;
}

export interface DispatchViolation { code: string; message: string }
export type DispatchParseResult =
  | { ok: true; dispatch: DispatchContract }
  | { ok: false; reason: "missing_dispatch_envelope" | "invalid_dispatch_json" };

export interface DispatchResult {
  dispatch_id: string;
  status: string;
  claimed_transition: string;
  actions: string[];
  changed_files: string[];
  commands: string[];
  exit_codes: number[];
  evidence: string[];
  assumptions: unknown[];
  blockers: unknown[];
  scope_changes: unknown[];
  policy_expansion_requested: unknown[];
}

export type ResultParseResult =
  | { ok: true; result: DispatchResult }
  | { ok: false; reason: "missing_result_envelope" | "invalid_result_json" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function hasItems(value: unknown): value is unknown[] { return Array.isArray(value) && value.length > 0; }
function actionMatches(actions: string[], expression: RegExp): boolean { return actions.some((action) => expression.test(action)); }

export function parseDispatchEnvelope(prompt: unknown): DispatchParseResult {
  if (typeof prompt !== "string" || !prompt.startsWith(`${dispatchEnvelopeMarker}\n`)) {
    return { ok: false, reason: "missing_dispatch_envelope" };
  }
  const end = prompt.indexOf("\n\n");
  const json = prompt.slice(dispatchEnvelopeMarker.length, end === -1 ? undefined : end).trim();
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return { ok: false, reason: "invalid_dispatch_json" };
    return { ok: true, dispatch: parsed as unknown as DispatchContract };
  } catch {
    return { ok: false, reason: "invalid_dispatch_json" };
  }
}

export function parseResultEnvelope(output: unknown): ResultParseResult {
  if (typeof output !== "string" || !output.startsWith(`${resultEnvelopeMarker}\n`)) {
    return { ok: false, reason: "missing_result_envelope" };
  }
  const end = output.indexOf("\n\n");
  const json = output.slice(resultEnvelopeMarker.length, end === -1 ? undefined : end).trim();
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return { ok: false, reason: "invalid_result_json" };
    return { ok: true, result: parsed as unknown as DispatchResult };
  } catch {
    return { ok: false, reason: "invalid_result_json" };
  }
}

export function validateDispatch(dispatch: DispatchContract): DispatchViolation[] {
  const violations: DispatchViolation[] = [];
  const add = (code: string, message: string) => violations.push({ code, message });
  const policyBundle = Array.isArray(dispatch.policy_bundle) ? dispatch.policy_bundle : [];
  const allowedActions = Array.isArray(dispatch.allowed_actions) ? dispatch.allowed_actions : [];
  const requiredText: Array<[keyof DispatchContract, string]> = [
    ["task_id", "missing_task_id"], ["current_state", "missing_current_state"],
    ["requested_transition", "missing_requested_transition"], ["request_kind", "missing_request_kind"],
    ["agent", "missing_agent"], ["role", "missing_role"], ["model_tier", "missing_model_tier"],
    ["task", "missing_task"], ["completion_boundary", "missing_completion_boundary"],
  ];
  for (const [field, code] of requiredText) if (!hasText(dispatch[field])) add(code, `Dispatch field ${field} is required.`);
  if (!workflowStates.has(dispatch.current_state) || !workflowStates.has(dispatch.requested_transition)) add("illegal_transition", "Dispatch names an unknown workflow state.");
  if (!requestKinds.has(dispatch.request_kind)) add("unknown_request_kind", "Dispatch request kind is not recognized.");
  if (!Object.hasOwn(roleCapabilities, dispatch.role)) add("unknown_role", "Dispatch role is not recognized.");
  if (!Object.hasOwn(agentRoles, dispatch.agent)) add("unknown_agent", "Dispatch agent is not recognized.");
  else if (!agentRoles[dispatch.agent]?.includes(dispatch.role)) add("agent_role_mismatch", "Dispatch agent is not assigned to this role.");
  if (!policyBundle.includes("axl/types.axlt")) add("missing_types", "Policy bundle must include axl/types.axlt.");
  if (!policyBundle.includes("rules/base.axlr")) add("missing_base_rules", "Policy bundle must include rules/base.axlr.");
  if (!hasItems(dispatch.acceptance_criteria)) add("missing_acceptance_criteria", "Dispatch requires acceptance criteria.");
  if (!hasItems(dispatch.required_evidence)) add("missing_required_evidence", "Dispatch requires evidence requirements.");
  if (!hasItems(allowedActions)) add("missing_allowed_actions", "Dispatch requires bounded allowed actions.");
  if (!hasItems(dispatch.forbidden_actions)) add("missing_forbidden_actions", "Dispatch requires forbidden actions.");
  if (!Array.isArray(dispatch.assumptions)) add("missing_assumptions", "Dispatch assumptions must be an array.");
  if (!Array.isArray(dispatch.unresolved)) add("missing_unresolved", "Dispatch unresolved items must be an array.");
  if (dispatch.mutation_authorized !== true && ["implementer", "test_author"].includes(dispatch.role)) add("mutation_without_authority", "Mutating role lacks mutation authority.");
  if (dispatch.role === "reviewer" && dispatch.mutation_authorized === true) add("reviewer_write_authority", "Reviewer may not receive mutation authority.");
  else if (dispatch.mutation_authorized === true && !["implementer", "test_author"].includes(dispatch.role)) add("role_mutation_forbidden", "This role may not receive mutation authority.");
  if (dispatch.role === "test_author" && actionMatches(allowedActions, /production code/i)) add("test_author_production_write", "Test author may not edit production code.");
  if (dispatch.role === "implementer" && actionMatches(allowedActions, /approved red tests/i)) add("implementer_red_test_write", "Implementer may not alter approved red tests.");
  if (actionMatches(allowedActions, /advance global (workflow )?state|global authority/i)) add("global_state_authority", "Subagents may not receive global workflow authority.");
  if (dispatch.role === "implementer" && dispatch.approved_specification !== true) add("implementation_without_specification", "Implementation requires approved specification.");
  if (dispatch.role === "implementer" && dispatch.behavior_change === true && dispatch.red_established !== true) add("behavior_without_red", "Behavioral implementation requires an established red test.");
  return violations;
}

export function validateResult(result: DispatchResult, dispatch: DispatchContract): DispatchViolation[] {
  const violations: DispatchViolation[] = [];
  const add = (code: string, message: string) => violations.push({ code, message });
  if (!hasText(result.dispatch_id)) add("missing_dispatch_id", "Result dispatch_id is required.");
  if (!hasText(result.status)) add("missing_status", "Result status is required.");
  if (!hasText(result.claimed_transition)) add("missing_claimed_transition", "Result claimed_transition is required.");
  if (!Array.isArray(result.actions)) add("missing_actions", "Result actions must be an array.");
  if (!Array.isArray(result.changed_files)) add("missing_changed_files", "Result changed_files must be an array.");
  if (!Array.isArray(result.commands)) add("missing_commands", "Result commands must be an array.");
  if (!Array.isArray(result.exit_codes)) add("missing_exit_codes", "Result exit_codes must be an array.");
  if (!Array.isArray(result.evidence)) add("missing_evidence", "Result evidence must be an array.");
  if (!Array.isArray(result.assumptions)) add("missing_assumptions", "Result assumptions must be an array.");
  if (!Array.isArray(result.blockers)) add("missing_blockers", "Result blockers must be an array.");
  if (!Array.isArray(result.scope_changes)) add("missing_scope_changes", "Result scope_changes must be an array.");
  if (!Array.isArray(result.policy_expansion_requested)) add("missing_policy_expansion_requested", "Result policy_expansion_requested must be an array.");
  if (violations.length > 0) return violations;
  if (!resultStatuses.has(result.status)) add("unknown_result_status", "Result status must be PASS, FAIL, or BLOCKED.");
  const actions = Array.isArray(result.actions) ? result.actions : [];
  const changedFiles = Array.isArray(result.changed_files) ? result.changed_files : [];
  const commands = Array.isArray(result.commands) ? result.commands : [];
  const exitCodes = Array.isArray(result.exit_codes) ? result.exit_codes : [];
  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  const blockers = Array.isArray(result.blockers) ? result.blockers : [];
  const scopeChanges = Array.isArray(result.scope_changes) ? result.scope_changes : [];
  const policyExpansion = Array.isArray(result.policy_expansion_requested) ? result.policy_expansion_requested : [];
  const allowedActions = Array.isArray(dispatch.allowed_actions) ? dispatch.allowed_actions : [];
  const requiredEvidence = Array.isArray(dispatch.required_evidence) ? dispatch.required_evidence : [];

  if (result.dispatch_id !== dispatch.task_id) add("dispatch_id_mismatch", "Result does not identify its accepted dispatch.");
  if (result.claimed_transition !== dispatch.requested_transition) add("claimed_transition_mismatch", "Result claims a transition outside the accepted dispatch.");
  if (dispatch.mutation_authorized !== true && changedFiles.length > 0) add("changed_files_without_authority", "Read-only dispatch result may not report changed files.");
  if (commands.length !== exitCodes.length) add("command_exit_code_mismatch", "Every reported command requires one exit code.");
  if (actions.some((action) => !allowedActions.includes(action))) add("action_outside_dispatch", "Result reports an action outside the accepted dispatch.");
  if (result.status === "PASS" && exitCodes.some((code) => code !== 0)) add("failed_command", "Passing result contains a failing command.");
  if (result.status === "PASS" && requiredEvidence.some((requirement) => {
    if (evidence.includes(requirement)) return false;
    const commandIndex = commands.indexOf(requirement);
    return commandIndex === -1 || exitCodes[commandIndex] !== 0;
  })) add("missing_required_evidence", "Result does not satisfy all required evidence.");
  if (result.status === "PASS" && blockers.length > 0) add("blockers_on_completion", "Passing result may not retain blockers.");
  if (result.status === "PASS" && scopeChanges.length > 0) add("scope_change_on_completion", "Scope changes require a new dispatch.");
  if (result.status === "PASS" && policyExpansion.length > 0) add("policy_expansion_on_completion", "Policy expansion requires router approval and a new dispatch.");
  return violations;
}

export function dispatchRejectionMessage(reason: string): string {
  return `DYNOVO_DISPATCH_REJECTED: ${reason}`;
}

export function resultRejectionMessage(reason: string): string {
  return `DYNOVO_RESULT_REJECTED: ${reason}`;
}
