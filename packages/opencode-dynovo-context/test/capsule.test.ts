import assert from "node:assert/strict";
import test from "node:test";

import { renderProtectedContextCapsule } from "../src/compaction/capsule.ts";
import type { ProtectedCheckpoint } from "../src/compaction/types.ts";

const checkpoint: ProtectedCheckpoint = {
  sessionID: "ses_01",
  checkpointID: "chk_01",
  createdAt: "2026-07-11T14:30:00.000Z",
  workspaceRoot: "/work/repo",
  rulesetRoot: "/rules/dynovo-agent-rules",
  rulesetCommit: "0123456789abcdef",
  baseRules: "rules/base.axlr",
  activeOverlays: ["rules/context.axlr"],
  ledgerPath: "/work/repo/.dynovo/state/tasks/task-01.axls",
  ledgerVersion: "7",
  activeRole: "implementer",
  activeAgentID: "build-l",
  delegationParent: "context-orchestrator",
  delegatedTask: "t005",
  allowedActions: ["edit production code in src/provider/**"],
  forbiddenActions: ["edit test/provider/fallback.test.ts"],
  objective: "Repair provider fallback",
  status: "DOING",
  risk: "HIGH",
  currentFocus: "t005",
  currentPlanID: "plan-01",
  currentGate: "green",
  nextAction: "Run npm test -- test/provider/fallback.test.ts --runInBand",
  constraints: [{ id: "c001", text: "Do not edit the approved red test" }],
  acceptanceCriteria: [
    { id: "ac001", text: "Fallback selects backup", status: "TODO", evidence: "NONE" },
  ],
  obligations: [{ id: "RDEV010", text: "Do not edit the red test." }],
  plan: [],
  files: [],
  decisions: [],
  rejectedApproaches: [],
  failures: [
    {
      id: "f001",
      command: "npm test -- test/provider/fallback.test.ts --runInBand",
      exitCode: "1",
      error: "Expected provider=backup, received provider=primary (attempts=2)",
      hypothesisStatus: "active",
      evidence: "e015",
    },
  ],
  verification: [],
  openQuestions: [],
  redactions: 0,
};

test("capsule is deterministic and preserves protected exact values", () => {
  const first = renderProtectedContextCapsule(checkpoint, { maxChars: 24_000 });
  const second = renderProtectedContextCapsule(checkpoint, { maxChars: 24_000 });

  assert.equal(first, second);
  assert.match(first, /^DYNOVO_PROTECTED_CONTEXT_V1\n/);
  assert.match(first, /active_role=implementer/);
  assert.match(first, /forbidden_actions=edit production code|forbidden_actions=edit test\/provider\/fallback\.test\.ts/);
  assert.match(first, /RDEV010: Do not edit the red test\./);
  assert.match(first, /attempts=2/);
  assert.match(first, /conflict_policy=canonical_files_override_summary/);
});

test("capsule redacts secrets before persistence or injection", () => {
  const secretCheckpoint = {
    ...checkpoint,
    nextAction: "curl -H 'Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456' https://example.test",
  };

  const rendered = renderProtectedContextCapsule(secretCheckpoint, { maxChars: 24_000 });
  assert.doesNotMatch(rendered, /ghp_/);
  assert.match(rendered, /<REDACTED:DYNOVO_SECRET>/);
});

test("bounded rendering drops completed history before active failure", () => {
  const verbose = {
    ...checkpoint,
    plan: Array.from({ length: 30 }, (_, index) => ({
      id: `done-${index.toString().padStart(2, "0")}`,
      status: "DONE",
      owner: "explorer",
      action: "Historical completed exploration with verbose details ".repeat(5),
      evidence: `e${index}`,
    })),
  };

  const rendered = renderProtectedContextCapsule(verbose, { maxChars: 2_400 });
  assert.ok(rendered.length <= 2_400);
  assert.match(rendered, /f001/);
  assert.match(rendered, /attempts=2/);
  assert.doesNotMatch(rendered, /done-29/);
});
