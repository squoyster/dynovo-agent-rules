import assert from "node:assert/strict";
import test from "node:test";

import DynovoContextPlugin from "../dist/index.js";

test("built plugin verifies retained AXL continuity through OpenCode hooks", async () => {
  const hooks = await DynovoContextPlugin({ directory: "/tmp", worktree: "/tmp" });
  const first = { system: [] };
  await hooks["experimental.chat.system.transform"](
    { sessionID: "ses_dist", model: {} },
    first,
  );
  const completionRef = first.system[0]?.match(
    /\^AXL_BOOTSTRAP_COMPLETE:AXL-[A-F0-9]{12}/,
  )?.[0];
  assert.ok(completionRef);

  await hooks["experimental.chat.messages.transform"]({}, {
    messages: [{
      info: { sessionID: "ses_dist", role: "assistant" },
      parts: [{ type: "text", text: completionRef }],
    }],
  });
  const retained = { system: [] };
  await hooks["experimental.chat.system.transform"](
    { sessionID: "ses_dist", model: {} },
    retained,
  );

  assert.match(retained.system[0] ?? "", /continuity_status="retained"/);
});

test("built plugin blocks native task calls without a dispatch envelope", async () => {
  const hooks = await DynovoContextPlugin({ directory: "/tmp", worktree: "/tmp" });
  await assert.rejects(
    hooks["tool.execute.before"](
      { tool: "task", sessionID: "ses_dist_dispatch", callID: "call_dist" },
      { args: { prompt: "uncontracted task" } },
    ),
    /DYNOVO_DISPATCH_REJECTED: missing_dispatch_envelope/,
  );
});
