import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parseDispatchEnvelope, parseResultEnvelope, validateDispatch, validateResult } from "../src/index.ts";
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

function result(overrides: Record<string, unknown> = {}) {
  return {
    dispatch_id: "TASK-42",
    status: "PASS",
    claimed_transition: "IMPLEMENTATION",
    actions: ["edit assigned production scope"],
    changed_files: ["src/provider.ts"],
    commands: ["npm test -- focused"],
    exit_codes: [0],
    evidence: ["npm test -- focused"],
    assumptions: [],
    blockers: [],
    scope_changes: [],
    policy_expansion_requested: [],
    ...overrides,
  };
}

function resultOutput(value: Record<string, unknown>): string {
  return `DYNOVO_RESULT_V1\n${JSON.stringify(value)}\n\nCompleted the bounded task.`;
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

test("result envelope validates completion against its accepted dispatch", () => {
  assert.deepEqual(parseResultEnvelope(resultOutput(result())), { ok: true, result: result() });
  assert.deepEqual(validateResult(result(), dispatch()), []);
  assert.deepEqual(
    validateResult(result({ actions: ["expand scope"], evidence: [], exit_codes: [1] }), dispatch()).map((item) => item.code),
    ["action_outside_dispatch", "failed_command", "missing_required_evidence"],
  );
});

test("result validator rejects an incomplete result contract before correlation", () => {
  assert.deepEqual(validateResult({} as never, dispatch()).map((item) => item.code), [
    "missing_dispatch_id",
    "missing_status",
    "missing_claimed_transition",
    "missing_actions",
    "missing_changed_files",
    "missing_commands",
    "missing_exit_codes",
    "missing_evidence",
    "missing_assumptions",
    "missing_blockers",
    "missing_scope_changes",
    "missing_policy_expansion_requested",
  ]);
});

test("passing result cannot claim scope, policy, or writes beyond a read-only dispatch", () => {
  const accepted = dispatch({
    current_state: "REVIEW",
    requested_transition: "VALIDATION",
    request_kind: "review",
    mutation_authorized: false,
    agent: "plan",
    role: "reviewer",
    allowed_actions: ["read and report findings"],
    required_evidence: ["review report"],
    behavior_change: false,
  });
  const violations = validateResult(result({
    claimed_transition: "COMPLETE",
    actions: ["read and report findings"],
    changed_files: ["src/provider.ts"],
    commands: ["review report", "npm test"],
    exit_codes: [0],
    evidence: ["review report"],
    blockers: ["unresolved finding"],
    scope_changes: ["also refactored provider"],
    policy_expansion_requested: ["rules/provider.axlr"],
  }), accepted);

  assert.deepEqual(violations.map((item) => item.code), [
    "claimed_transition_mismatch",
    "changed_files_without_authority",
    "command_exit_code_mismatch",
    "blockers_on_completion",
    "scope_change_on_completion",
    "policy_expansion_on_completion",
  ]);
});

test("blocked result preserves failed evidence and expansion requests for router handling", () => {
  assert.deepEqual(validateResult(result({
    status: "BLOCKED",
    exit_codes: [1],
    evidence: [],
    blockers: ["focused test still fails"],
    scope_changes: ["provider fallback also needs repair"],
    policy_expansion_requested: ["rules/provider.axlr"],
  }), dispatch()), []);
});

test("result status cannot bypass pass evidence checks", () => {
  assert.deepEqual(
    validateResult(result({ status: "UNKNOWN" }), dispatch()).map((item) => item.code),
    ["unknown_result_status"],
  );
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

test("task after-hook correlates and validates one result per accepted dispatch", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-result-hook-"));
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  const before = adapter.hooks["tool.execute.before"];
  const after = adapter.hooks["tool.execute.after"];
  const input = { tool: "task", sessionID: "ses_result", callID: "call_result_1" };
  const args = { prompt: taskPrompt(dispatch()) };

  await before(input, { args });
  await assert.rejects(
    after({ ...input, args }, { title: "Task", output: "ordinary result", metadata: {} }),
    /DYNOVO_RESULT_REJECTED: missing_result_envelope/,
  );

  const secondInput = { ...input, callID: "call_result_2" };
  await before(secondInput, { args });
  await assert.rejects(
    after({ ...secondInput, args }, { title: "Task", output: resultOutput(result({ dispatch_id: "TASK-other" })), metadata: {} }),
    /DYNOVO_RESULT_REJECTED: dispatch_id_mismatch/,
  );

  const thirdInput = { ...input, callID: "call_result_3" };
  await before(thirdInput, { args });
  await after({ ...thirdInput, args }, { title: "Task", output: resultOutput(result()), metadata: {} });
  await assert.rejects(
    after({ ...thirdInput, args }, { title: "Task", output: resultOutput(result()), metadata: {} }),
    /DYNOVO_RESULT_REJECTED: missing_accepted_dispatch/,
  );
  const ledger = await readFile(join(root, ".dynovo/state/tasks/ses_result.axls"), "utf8");
  assert.match(ledger, /status=REJECTED/);
  assert.match(ledger, /validation=missing_result_envelope/);
});

test("fresh adapter recovers a pending dispatch from the AXL-S ledger", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-result-restart-"));
  const input = { tool: "task", sessionID: "ses_restart", callID: "call_restart" };
  const args = { prompt: taskPrompt(dispatch()) };
  const first = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  await first.hooks["tool.execute.before"](input, { args });

  const restarted = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  await restarted.hooks["tool.execute.after"](
    { ...input, args },
    { title: "Task", output: resultOutput(result()), metadata: {} },
  );

  const ledger = await readFile(
    join(root, ".dynovo/state/tasks/ses_restart.axls"),
    "utf8",
  );
  assert.match(ledger, /@DELEGATIONS/);
  assert.match(ledger, /status=pending/);
  assert.match(ledger, /@EVIDENCE/);
  assert.match(ledger, /status=PASS/);
  assert.match(ledger, /@LOG/);
  assert.match(ledger, /dispatch_result_recorded/);
});
