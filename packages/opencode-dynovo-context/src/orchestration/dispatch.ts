import { roleCapabilities } from "./roles.js";

export const dispatchEnvelopeMarker = "DYNOVO_DISPATCH_V1";

const workflowStates = new Set([
  "INTAKE", "DISCOVERY", "SPECIFICATION", "BASELINE_READY", "RED_REQUIRED",
  "RED_ESTABLISHED", "IMPLEMENTATION", "GREEN_ESTABLISHED", "REVIEW",
  "VALIDATION", "INTEGRATION_READY", "COMPLETE", "BLOCKED",
]);
const requestKinds = new Set(["report", "inspect", "research", "plan", "execute", "review", "modify"]);
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

export function dispatchRejectionMessage(reason: string): string {
  return `DYNOVO_DISPATCH_REJECTED: ${reason}`;
}
