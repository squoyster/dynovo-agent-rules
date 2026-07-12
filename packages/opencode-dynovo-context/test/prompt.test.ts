import assert from "node:assert/strict";
import test from "node:test";

import { renderDynovoCompactionPrompt } from "../src/compaction/prompt.ts";

test("compaction prompt is the pinned continuation contract", () => {
  const prompt = renderDynovoCompactionPrompt();

  assert.match(prompt, /^You are producing a continuation record/);
  assert.match(prompt, /## Delegation State/);
  assert.match(prompt, /## Recovery/);
  assert.match(prompt, /Do not mark work complete without evidence\./);
  assert.match(prompt, /Keep the result compact enough for continuation by a low-cost orchestration\nmodel\.$/);
});
