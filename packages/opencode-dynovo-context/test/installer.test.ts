import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);

test("installer preserves JSONC comments and deduplicates existing arrays", async () => {
  const home = await mkdtemp(join(tmpdir(), "dynovo-installer-"));
  const xdgConfig = join(home, "xdg");
  const configDir = join(xdgConfig, "opencode");
  const configPath = join(configDir, "opencode.jsonc");
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, '{\n  // keep me\n  "instructions": [\n    "old"\n  ],\n  "plugin": [\n    "old-plugin"\n  ]\n}\n');
  const script = resolve(import.meta.dirname, "../../../bin/install-opencode-rules");
  const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: xdgConfig };
  await exec(script, ["--rules-only", "--with-context-plugin"], { env });
  await exec(script, ["--rules-only", "--with-context-plugin"], { env });
  const result = await readFile(configPath, "utf8");
  assert.match(result, /\/\/ keep me/);
  assert.equal(result.match(/AGENTS\.md/g)?.length, 1);
  assert.equal(result.match(/dist\/index\.js/g)?.length, 1);
});

test("installer adds missing arrays with portable awk", async () => {
  const home = await mkdtemp(join(tmpdir(), "dynovo-installer-empty-"));
  const xdgConfig = join(home, "xdg");
  const configDir = join(xdgConfig, "opencode");
  const configPath = join(configDir, "opencode.json");
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, '{\n  "$schema": "https://opencode.ai/config.json"\n}\n');
  const script = resolve(import.meta.dirname, "../../../bin/install-opencode-rules");
  await exec(script, ["--rules-only", "--with-context-plugin"], { env: { ...process.env, HOME: home, XDG_CONFIG_HOME: xdgConfig } });
  const result = await readFile(configPath, "utf8");
  assert.match(result, /"instructions": \[/);
  assert.match(result, /"plugin": \[/);

  const config = JSON.parse(result) as { plugin: string[] };
  const installedPlugin = await import(pathToFileURL(config.plugin[0]!).href) as {
    default: (input: { directory: string; worktree: string }) => Promise<Record<string, unknown>>;
  };
  const hooks = await installedPlugin.default({ directory: home, worktree: home });
  assert.equal(typeof hooks["experimental.chat.system.transform"], "function");
});
