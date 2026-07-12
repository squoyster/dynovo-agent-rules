import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);

test("installer preserves JSONC comments and deduplicates existing arrays", async () => {
  const home = await mkdtemp(join(tmpdir(), "dynovo-installer-"));
  const configDir = join(home, ".config/opencode");
  const configPath = join(configDir, "opencode.jsonc");
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, '{\n  // keep me\n  "instructions": [\n    "old"\n  ],\n  "plugin": [\n    "old-plugin"\n  ]\n}\n');
  const script = resolve(import.meta.dirname, "../../../bin/install-opencode-rules");
  const env = { ...process.env, HOME: home };
  await exec(script, ["--rules-only", "--with-context-plugin"], { env });
  await exec(script, ["--rules-only", "--with-context-plugin"], { env });
  const result = await readFile(configPath, "utf8");
  assert.match(result, /\/\/ keep me/);
  assert.equal(result.match(/AGENTS\.md/g)?.length, 1);
  assert.equal(result.match(/dist\/index\.js/g)?.length, 1);
});
