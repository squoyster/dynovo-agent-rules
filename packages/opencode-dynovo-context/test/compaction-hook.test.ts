import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createOpenCodeAdapter } from "../src/opencode/adapter.ts";
import { SessionRegistry } from "../src/session-registry.ts";

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

test("recovery is injected once into the resumed normal message", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-recovery-delivery-"));
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  await adapter.hooks["experimental.session.compacting"]?.({ sessionID: "ses_delivery" }, { context: [] });
  await adapter.hooks.event?.({ event: { type: "session.compacted", properties: { sessionID: "ses_delivery" } } });
  const first = { parts: [] as unknown[] };
  const second = { parts: [] as unknown[] };
  await adapter.hooks["chat.message"]?.({ sessionID: "ses_delivery" }, first);
  await adapter.hooks["chat.message"]?.({ sessionID: "ses_delivery" }, second);
  assert.equal(first.parts.length, 1);
  assert.equal(second.parts.length, 0);
});

test("separate sessions retain separate checkpoint state", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-concurrent-"));
  const adapter = await createOpenCodeAdapter({ directory: root, worktree: root, rulesetRoot: root });
  const left = { context: [] as string[] };
  const right = { context: [] as string[] };
  await Promise.all([
    adapter.hooks["experimental.session.compacting"]?.({ sessionID: "ses_left" }, left),
    adapter.hooks["experimental.session.compacting"]?.({ sessionID: "ses_right" }, right),
  ]);
  assert.match(left.context[0] ?? "", /session_id=ses_left/);
  assert.match(right.context[0] ?? "", /session_id=ses_right/);
});

test("unknown roles and unavailable rulesets are represented as warnings, never inferred", async () => {
  const root = await mkdtemp(join(tmpdir(), "dynovo-fallback-policy-"));
  await new SessionRegistry(root).put({
    sessionID: "ses_unknown",
    workspaceRoot: root,
    activeAgentRole: "unrecognized-worker",
    rulesetRoot: root,
    activeOverlays: ["missing-rules.axlr"],
  });
  const adapter = await createOpenCodeAdapter({
    directory: root,
    worktree: root,
    rulesetRoot: root,
    config: { failurePolicy: { ...{
      missingLedger: "reconstruct-minimal",
      invalidLedger: "inject-raw-and-warn",
      writeFailure: "continue-with-warning",
      missingRuleset: "reference-known-state",
      unknownAgent: "warn",
    } } },
  });
  const output = { context: [] as string[] };
  await adapter.hooks["experimental.session.compacting"]?.({ sessionID: "ses_unknown" }, output);

  assert.match(output.context[0] ?? "", /active_role=UNKNOWN/);
  assert.match(output.context[0] ?? "", /UNKNOWN_AGENT_ROLE: permissions are not inferred/);
  assert.match(output.context[0] ?? "", /RULESET_UNAVAILABLE:/);
});
