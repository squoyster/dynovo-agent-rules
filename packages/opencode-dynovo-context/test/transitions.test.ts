import assert from "node:assert/strict";
import test from "node:test";

import { evaluateTransition } from "../src/index.ts";

const dispatch = {
  task_id: "TASK-transition",
  current_state: "RED_ESTABLISHED",
  requested_transition: "IMPLEMENTATION",
  request_kind: "execute",
  mutation_authorized: true,
  agent: "build-m",
  role: "implementer",
  model_tier: "m",
  policy_bundle: ["axl/types.axlt", "rules/base.axlr"],
  task: "Implement the bounded change.",
  acceptance_criteria: ["Focused test passes."],
  allowed_actions: ["edit assigned production scope"],
  forbidden_actions: ["advance global workflow state"],
  required_evidence: ["npm test -- focused"],
  completion_boundary: "Return evidence.",
  assumptions: [],
  unresolved: [],
};

const pass = { status: "PASS", claimed_transition: "IMPLEMENTATION" };

test("transition evaluator accepts a legal evidence-backed transition", () => {
  assert.deepEqual(evaluateTransition("RED_ESTABLISHED", dispatch, pass), {
    decision: "accepted",
    from: "RED_ESTABLISHED",
    to: "IMPLEMENTATION",
  });
});

test("transition evaluator rejects stale, illegal, and non-passing results", () => {
  assert.deepEqual(evaluateTransition("IMPLEMENTATION", dispatch, pass), {
    decision: "rejected", reason: "stale_current_state",
  });
  assert.deepEqual(evaluateTransition("INTAKE", { ...dispatch, current_state: "INTAKE", requested_transition: "IMPLEMENTATION" }, pass), {
    decision: "rejected", reason: "illegal_transition",
  });
  assert.deepEqual(evaluateTransition("RED_ESTABLISHED", dispatch, { status: "BLOCKED", claimed_transition: "IMPLEMENTATION" }), {
    decision: "blocked", reason: "result_blocked",
  });
});
