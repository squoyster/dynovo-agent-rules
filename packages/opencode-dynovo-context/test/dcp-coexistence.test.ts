import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createOpenCodeAdapter } from "../src/opencode/adapter.ts";

test("Dynovo does not register a message-pruning transform owned by DCP", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-dcp-"));
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  assert.equal("experimental.chat.messages.transform" in adapter.hooks, false);
  const output = { context: ["[DCP compressed tool range: original unavailable]"] as string[] };
  await adapter.hooks["experimental.session.compacting"]({ sessionID: "ses_dcp" }, output);
  assert.equal(output.context.filter((item) => item.startsWith("DYNOVO_PROTECTED_CONTEXT_V1")).length, 1);
  assert.equal(output.context[0], "[DCP compressed tool range: original unavailable]");
});
