import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { projectLedger } from "../src/axls/projector.ts";
import { createOpenCodeAdapter } from "../src/opencode/adapter.ts";

test("multi-agent ledger gives the coordinator a deterministic resume state", async () => {
  const source = await readFile(new URL("./fixtures/end-to-end.axls", import.meta.url), "utf8");
  const state = projectLedger(source);
  assert.equal(state.objective, '"Repair provider fallback"');
  assert.equal(state.currentGate, "green");
  assert.equal(state.nextAction, '"Delegate t004 to implementer"');
  assert.equal(state.plan.find((item) => item.id === "t004")?.owner, "implementer");
  assert.equal(state.delegations.find((item) => item.id === "a003")?.owner, "build-1");
  assert.equal(state.failures[0]?.command, "npm test -- test/provider/fallback.test.ts");
  assert.equal(state.constraints[0]?.id, "c001");
  assert.equal(state.rejectedApproaches[0]?.id, "r001");
});

test("compaction hook renders the multi-agent protected capsule", async () => {
  const source = await readFile(new URL("./fixtures/end-to-end.axls", import.meta.url), "utf8");
  const root = await mkdtemp(join(tmpdir(), "dynovo-e2e-hook-"));
  await mkdir(join(root, ".dynovo/state/tasks"), { recursive: true });
  await writeFile(join(root, ".dynovo/state/tasks/ses_e2e.axls"), source);
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  const output = { context: [] as string[] };
  await adapter.hooks["experimental.session.compacting"]({ sessionID: "ses_e2e" }, output);
  const capsule = output.context[0] ?? "";
  assert.match(capsule, /objective="Repair provider fallback"/);
  assert.match(capsule, /current_gate=green/);
  assert.match(capsule, /a003 \| status=DOING \| owner=build-1/);
  assert.match(capsule, /c001/);
  assert.match(capsule, /npm test -- test\/provider\/fallback.test\.ts/);
  assert.match(capsule, /next_action="Delegate t004 to implementer"/);
});
