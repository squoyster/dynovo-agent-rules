import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { projectLedger } from "../src/axls/projector.ts";

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
