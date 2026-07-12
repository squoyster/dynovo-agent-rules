export interface TransitionDispatch {
  current_state: string;
  requested_transition: string;
}

export interface TransitionResult {
  status: string;
  claimed_transition: string;
}

export type TransitionDecision =
  | { decision: "accepted"; from: string; to: string }
  | { decision: "blocked"; reason: "result_blocked" | "result_failed" }
  | { decision: "rejected"; reason: "stale_current_state" | "claimed_transition_mismatch" | "illegal_transition" };

const legalTransitions: Record<string, readonly string[]> = {
  INTAKE: ["DISCOVERY", "SPECIFICATION", "COMPLETE", "BLOCKED"],
  DISCOVERY: ["SPECIFICATION", "COMPLETE", "BLOCKED"],
  SPECIFICATION: ["BASELINE_READY", "IMPLEMENTATION", "BLOCKED"],
  BASELINE_READY: ["RED_REQUIRED", "IMPLEMENTATION", "BLOCKED"],
  RED_REQUIRED: ["RED_ESTABLISHED", "BLOCKED"],
  RED_ESTABLISHED: ["IMPLEMENTATION", "BLOCKED"],
  IMPLEMENTATION: ["GREEN_ESTABLISHED", "REVIEW", "BLOCKED"],
  GREEN_ESTABLISHED: ["REVIEW", "BLOCKED"],
  REVIEW: ["VALIDATION", "BLOCKED"],
  VALIDATION: ["INTEGRATION_READY", "COMPLETE", "BLOCKED"],
  INTEGRATION_READY: ["COMPLETE", "BLOCKED"],
  COMPLETE: [],
  BLOCKED: [],
};

export function evaluateTransition(currentState: string, dispatch: TransitionDispatch, result: TransitionResult): TransitionDecision {
  if (result.status === "BLOCKED") return { decision: "blocked", reason: "result_blocked" };
  if (result.status === "FAIL") return { decision: "blocked", reason: "result_failed" };
  if (result.status !== "PASS") return { decision: "rejected", reason: "illegal_transition" };
  if (dispatch.current_state !== currentState) return { decision: "rejected", reason: "stale_current_state" };
  if (result.claimed_transition !== dispatch.requested_transition) return { decision: "rejected", reason: "claimed_transition_mismatch" };
  if (!legalTransitions[currentState]?.includes(dispatch.requested_transition)) return { decision: "rejected", reason: "illegal_transition" };
  return { decision: "accepted", from: currentState, to: dispatch.requested_transition };
}
