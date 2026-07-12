import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseAxls, serializeAxls } from "../src/axls/index.ts";

const fixtureUrl = new URL("./fixtures/active-task.axls", import.meta.url);

test("AXL-S round trip preserves unknown blocks and exact command text", async () => {
  const source = await readFile(fixtureUrl, "utf8");
  const document = parseAxls(source);

  assert.equal(serializeAxls(document), source);
  assert.equal(document.blocks.get("VENDOR_EXTENSION")?.records[0]?.id, "x001");
  assert.equal(
    document.blocks.get("FAILURES")?.records[0]?.fields.command,
    "npm test -- test/provider/fallback.test.ts --runInBand",
  );
});

test("AXL-S mutation rejects plan deletion and immutable context changes", () => {
  const planDeletion = `@META\nid: x\n\n@PLAN\nt001 status=SKIP\n`;
  const document = parseAxls(planDeletion);

  assert.throws(() => document.deleteRecord("PLAN", "t001"), /append-only/i);
  assert.throws(
    () => document.replaceRecord("CTX", "c001", { source: "changed" }),
    /immutable/i,
  );
});
