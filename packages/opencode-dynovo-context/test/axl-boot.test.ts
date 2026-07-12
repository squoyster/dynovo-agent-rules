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
