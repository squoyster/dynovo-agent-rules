import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createOpenCodeAdapter } from "../src/opencode/adapter.ts";

test("hook persists one checkpoint before injecting one capsule and prompt", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-hook-"));
  const observations: string[] = [];
  const adapter = await createOpenCodeAdapter({
    directory: root,
    worktree: root,
    rulesetRoot: root,
    observe(event) {
      observations.push(event);
    },
  });
  const output: { context: string[]; prompt?: string } = { context: [] };

  await adapter.hooks["experimental.session.compacting"]?.(
    { sessionID: "ses_hook" },
    output,
  );

  assert.equal(output.context.length, 1);
  assert.match(output.context[0] ?? "", /^DYNOVO_PROTECTED_CONTEXT_V1/);
  assert.match(output.prompt ?? "", /## Recovery/);
  assert.ok(observations.indexOf("capsule-persisted") < observations.indexOf("context-injected"));
  const latest = await readFile(
    join(root, ".dynovo/checkpoints/ses_hook/latest"),
    "utf8",
  );
  assert.match(latest, /^chk_/);
});

test("duplicate hook execution is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-idempotent-"));
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  const first: { context: string[]; prompt?: string } = { context: [] };
  const second: { context: string[]; prompt?: string } = { context: [] };

  await adapter.hooks["experimental.session.compacting"]?.({ sessionID: "ses_same" }, first);
  await adapter.hooks["experimental.session.compacting"]?.({ sessionID: "ses_same" }, second);

  assert.deepEqual(second, first);
});

test("successful compaction requests recovery exactly once", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-recovery-"));
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  const output: { context: string[]; prompt?: string } = { context: [] };
  await adapter.hooks["experimental.session.compacting"]?.({ sessionID: "ses_recovery" }, output);

  const compacted = {
    type: "session.compacted" as const,
    properties: { sessionID: "ses_recovery" },
  };
  await adapter.hooks.event?.({ event: compacted });
  await adapter.hooks.event?.({ event: compacted });

  assert.equal(adapter.pendingRecovery("ses_recovery")?.deliveries, 1);
  assert.match(
    adapter.pendingRecovery("ses_recovery")?.instruction ?? "",
    /Canonical files, Git state, and executable evidence override the summary\./,
  );
});
