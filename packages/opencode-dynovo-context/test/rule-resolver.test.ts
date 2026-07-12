import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveActiveObligations } from "../src/rule-resolver.ts";

test("rule projection requires matching scope and explicit trigger facts", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-rules-"));
  await writeFile(join(root, "rules.axlr"), "R001: coordinator | context_pressure_high(T) -> M checkpoint_axls_before_compaction(T)\nR002: all | start(T) -> F invent_state(T)\n");
  assert.deepEqual(await resolveActiveObligations(root, ["rules.axlr"], "coordinator"), []);
  assert.deepEqual(await resolveActiveObligations(root, ["rules.axlr"], "coordinator", { context_pressure_high: true }), [{ id: "R001", text: "checkpoint_axls_before_compaction(T)" }]);
});
