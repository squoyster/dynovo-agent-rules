import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parseDispatchEnvelope, validateDispatch } from "../src/index.ts";
import { createOpenCodeAdapter } from "../src/opencode/adapter.ts";

function dispatch(overrides: Record<string, unknown> = {}) {
  return {
    task_id: "TASK-42",
    current_state: "RED_ESTABLISHED",
    requested_transition: "IMPLEMENTATION",
    request_kind: "execute",
    mutation_authorized: true,
    agent: "build-m",
    role: "implementer",
    model_tier: "m",
    policy_bundle: ["axl/types.axlt", "rules/base.axlr", "agents/build-m.axlr"],
    task: "Implement the bounded change.",
    acceptance_criteria: ["The focused test passes."],
    allowed_actions: ["edit assigned production scope"],
    forbidden_actions: ["edit approved red tests", "advance global workflow state"],
    required_evidence: ["npm test -- focused"],
    completion_boundary: "Return the changed files and command output.",
    assumptions: [],
    unresolved: [],
    approved_specification: true,
    red_established: true,
    behavior_change: true,
    ...overrides,
  };
}

function taskPrompt(value: Record<string, unknown>): string {
  return `DYNOVO_DISPATCH_V1\n${JSON.stringify(value)}\n\nCarry out only the bounded task.`;
}

test("dispatch validator accepts a complete bounded implementation contract", () => {
  assert.deepEqual(validateDispatch(dispatch()), []);
});

test("dispatch validator returns precise invariant violations", () => {
  const violations = validateDispatch(dispatch({
    agent: "invented-agent",
    policy_bundle: ["rules/base.axlr"],
    mutation_authorized: false,
    approved_specification: false,
    red_established: false,
    acceptance_criteria: [],
    required_evidence: [],
    allowed_actions: ["advance global workflow state"],
  }));

  assert.deepEqual(violations.map((item) => item.code), [
    "unknown_agent",
    "missing_types",
    "missing_acceptance_criteria",
    "missing_required_evidence",
    "mutation_without_authority",
    "global_state_authority",
    "implementation_without_specification",
    "behavior_without_red",
  ]);
});

test("dispatch validator does not grant mutation authority to a planning role", () => {
  const violations = validateDispatch(dispatch({
    agent: "plan-l",
    role: "planner",
    mutation_authorized: true,
    current_state: "SPECIFICATION",
    requested_transition: "BASELINE_READY",
    request_kind: "plan",
    behavior_change: false,
  }));
  assert.ok(violations.some((item) => item.code === "role_mutation_forbidden"));
});

test("dispatch envelope parser rejects malformed and accepts a versioned header", () => {
  assert.deepEqual(parseDispatchEnvelope("ordinary task"), { ok: false, reason: "missing_dispatch_envelope" });
  assert.deepEqual(parseDispatchEnvelope("DYNOVO_DISPATCH_V1\n{not json}"), { ok: false, reason: "invalid_dispatch_json" });
  assert.deepEqual(parseDispatchEnvelope(taskPrompt(dispatch())), { ok: true, dispatch: dispatch() });
});

test("task hook blocks uncontracted and invalid native task dispatches", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-dispatch-hook-"));
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  const hook = adapter.hooks["tool.execute.before"];

  await assert.rejects(
    hook({ tool: "task", sessionID: "ses_dispatch", callID: "call_1" }, { args: { prompt: "ordinary task" } }),
    /DYNOVO_DISPATCH_REJECTED: missing_dispatch_envelope/,
  );
  await assert.rejects(
    hook({ tool: "task", sessionID: "ses_dispatch", callID: "call_missing" }, { args: { prompt: taskPrompt({}) } }),
    /DYNOVO_DISPATCH_REJECTED: missing_task_id/,
  );
  await assert.rejects(
    hook({ tool: "task", sessionID: "ses_dispatch", callID: "call_2" }, { args: { prompt: taskPrompt(dispatch({ agent: "plan", role: "reviewer", mutation_authorized: true })) } }),
    /DYNOVO_DISPATCH_REJECTED: reviewer_write_authority/,
  );
  await hook({ tool: "task", sessionID: "ses_dispatch", callID: "call_3" }, { args: { prompt: taskPrompt(dispatch()) } });
  await hook({ tool: "read", sessionID: "ses_dispatch", callID: "call_4" }, { args: {} });
});
