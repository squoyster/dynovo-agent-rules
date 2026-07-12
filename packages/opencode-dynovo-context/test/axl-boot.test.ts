import assert from "node:assert/strict";
import test from "node:test";

import DynovoContextPlugin from "../src/index.ts";

test("plugin exposes the AXL boot system transform", async () => {
  const hooks = await DynovoContextPlugin({ directory: "/tmp", worktree: "/tmp" });
  const transform = hooks["experimental.chat.system.transform"];
  assert.equal(typeof transform, "function");

  const first: { system?: string[] } = {};
  await transform?.({ sessionID: "ses_boot" }, first);

  assert.match(first.system?.[0] ?? "", /<AXL_CONTINUITY canary="AXL-[A-F0-9]{12}">/);
  assert.match(first.system?.[0] ?? "", /Load `D001` and `D002` first\./);
});

test("boot reuses a session canary and creates fresh canaries without session IDs", async () => {
  const hooks = await DynovoContextPlugin({ directory: "/tmp", worktree: "/tmp" });
  const transform = hooks["experimental.chat.system.transform"];
  const first: { system?: string[] } = {};
  const second: { system?: string[] } = {};
  const noSession: { system?: string[] } = {};

  await transform?.({ sessionID: "ses_boot" }, first);
  await transform?.({ sessionID: "ses_boot" }, second);
  await transform?.({}, noSession);

  const canary = first.system?.[0]?.match(/canary="(AXL-[A-F0-9]{12})"/)?.[1];
  assert.ok(canary);
  assert.match(second.system?.[0] ?? "", new RegExp(`canary="${canary}"`));
  assert.doesNotMatch(noSession.system?.[0] ?? "", new RegExp(`canary="${canary}"`));
});

test("plugin decides continuity from retained assistant context", async () => {
  const hooks = await DynovoContextPlugin({ directory: "/tmp", worktree: "/tmp" });
  const transformMessages = (hooks as unknown as {
    "experimental.chat.messages.transform": (input: {}, output: { messages: Array<{ info: { sessionID: string; role: string }; parts: Array<{ type: string; text?: string }> }> }) => Promise<void>;
  })["experimental.chat.messages.transform"];
  const transformSystem = hooks["experimental.chat.system.transform"];
  const first: { system?: string[] } = {};

  await transformSystem?.({ sessionID: "ses_retained" }, first);
  const completionRef = first.system?.[0]?.match(/\^AXL_BOOTSTRAP_COMPLETE:AXL-[A-F0-9]{12}/)?.[0];
  assert.ok(completionRef);

  await transformMessages({}, {
    messages: [{
      info: { sessionID: "ses_retained", role: "assistant" },
      parts: [{ type: "text", text: `Bootstrap complete. ${completionRef}` }],
    }],
  });
  const retained: { system?: string[] } = {};
  await transformSystem?.({ sessionID: "ses_retained" }, retained);

  assert.match(retained.system?.[0] ?? "", /continuity_status="retained"/);
  assert.doesNotMatch(retained.system?.[0] ?? "", /YOU MUST \(M\) EXECUTE THE FOLLOWING BEFORE ANY OTHER ACTION/);

  await transformMessages({}, {
    messages: [{
      info: { sessionID: "ses_retained", role: "assistant" },
      parts: [{ type: "text", text: "The retained marker was lost." }],
    }],
  });
  const lost: { system?: string[] } = {};
  await transformSystem?.({ sessionID: "ses_retained" }, lost);
  assert.match(
    lost.system?.[0] ?? "",
    /YOU MUST \(M\) EXECUTE THE FOLLOWING BEFORE ANY OTHER ACTION/,
  );
});

test("disabled plugin does not install the AXL boot transform", async () => {
  const hooks = await DynovoContextPlugin(
    { directory: "/tmp", worktree: "/tmp" },
    { enabled: false },
  );

  assert.equal(hooks["experimental.chat.system.transform"], undefined);
  assert.equal(
    (hooks as Record<string, unknown>)["experimental.chat.messages.transform"],
    undefined,
  );
});

test("deleting a session releases its continuity canary", async () => {
  const hooks = await DynovoContextPlugin({ directory: "/tmp", worktree: "/tmp" });
  const transform = hooks["experimental.chat.system.transform"];
  const first: { system?: string[] } = {};
  await transform?.({ sessionID: "ses_deleted" }, first);
  const firstCanary = first.system?.[0]?.match(/canary="(AXL-[A-F0-9]{12})"/)?.[1];
  assert.ok(firstCanary);

  await hooks.event?.({
    event: {
      type: "session.deleted",
      properties: { info: { id: "ses_deleted" } },
    } as never,
  });

  const next: { system?: string[] } = {};
  await transform?.({ sessionID: "ses_deleted" }, next);
  assert.doesNotMatch(next.system?.[0] ?? "", new RegExp(`canary="${firstCanary}"`));
});
