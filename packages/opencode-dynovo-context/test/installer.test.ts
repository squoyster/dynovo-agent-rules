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
  const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: xdgConfig, OPENCODE_CONFIG: "" };
  await exec(script, ["--rules-only", "--with-context-plugin"], { env });
  const deploymentRoot = join(configDir, "dynovo-agent-rules");
  await writeFile(join(deploymentRoot, "plugin/stale-plugin.mjs"), "stale\n");
  await exec(script, ["--rules-only", "--with-context-plugin"], { env });
  const result = await readFile(configPath, "utf8");
  assert.match(result, /\/\/ keep me/);
  assert.equal(result.match(/AGENTS\.md/g)?.length, 1);
  assert.equal(result.match(/dynovo-agent-rules\/plugin\/index\.js/g)?.length, 1);
  await assert.rejects(readFile(join(deploymentRoot, "plugin/stale-plugin.mjs"), "utf8"));

  await exec(script, ["--rules-only"], { env });
  const preservedPlugin = await import(
    pathToFileURL(join(deploymentRoot, "plugin/index.js")).href
  ) as { default: unknown };
  assert.equal(typeof preservedPlugin.default, "function");
});

test("installer adds missing arrays with portable awk", async () => {
  const home = await mkdtemp(join(tmpdir(), "dynovo-installer-empty-"));
  const xdgConfig = join(home, "xdg");
  const configDir = join(xdgConfig, "opencode");
  const configPath = join(configDir, "opencode.json");
  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, '{\n  "$schema": "https://opencode.ai/config.json"\n}\n');
  const script = resolve(import.meta.dirname, "../../../bin/install-opencode-rules");
  await exec(script, ["--with-context-plugin"], { env: { ...process.env, HOME: home, XDG_CONFIG_HOME: xdgConfig, OPENCODE_CONFIG: "" } });
  const result = await readFile(configPath, "utf8");
  assert.match(result, /"instructions": \[/);
  assert.match(result, /"plugin": \[/);

  const config = JSON.parse(result) as { instructions: string[]; plugin: string[] };
  const deploymentRoot = join(configDir, "dynovo-agent-rules");
  assert.equal(config.instructions?.[0], join(deploymentRoot, "AGENTS.md"));
  assert.equal(
    config.plugin[0],
    join(deploymentRoot, "plugin/index.js"),
  );
  await Promise.all([
    readFile(join(deploymentRoot, "AGENTS.md"), "utf8"),
    readFile(join(deploymentRoot, "axl/types.axlt"), "utf8"),
    readFile(join(deploymentRoot, "rules/base.axlr"), "utf8"),
    readFile(join(deploymentRoot, "agents/orchestrator.axlr"), "utf8"),
    readFile(join(deploymentRoot, "skills/axl-encode/SKILL.md"), "utf8"),
    readFile(join(deploymentRoot, ".specs/Rigorous-Agentic-Development-Specification.md"), "utf8"),
    readFile(join(deploymentRoot, "docs/axl-router-agentic-spec.md"), "utf8"),
    readFile(join(deploymentRoot, "bin/test-opencode-router-integration"), "utf8"),
    readFile(join(deploymentRoot, "plugin/axl-boot.mjs"), "utf8"),
  ]);
  await assert.rejects(
    readFile(join(deploymentRoot, "plugin/deployed-plugin.mjs"), "utf8"),
  );
  const deployedTypes = await readFile(join(deploymentRoot, "axl/types.axlt"), "utf8");
  assert.match(deployedTypes, /^ctxref: \^id$/m);
  assert.match(deployedTypes, /^\^id: value_or_marker_present_in_active_model_context$/m);

  const installedPlugin = await import(pathToFileURL(config.plugin[0]).href) as {
    default: (input: { directory: string; worktree: string }) => Promise<Record<string, unknown>>;
  };
  assert.deepEqual(Object.keys(installedPlugin), ["default"]);
  const hooks = await installedPlugin.default({ directory: home, worktree: home });
  assert.equal(typeof hooks["experimental.chat.system.transform"], "function");
  assert.equal(typeof hooks["tool.execute.before"], "function");
  assert.equal(typeof hooks["tool.execute.after"], "function");
});

test("installer activates the deployed router without losing JSONC comments", async () => {
  const home = await mkdtemp(join(tmpdir(), "dynovo-installer-router-"));
  const xdgConfig = join(home, "xdg");
  const configDir = join(home, ".config/opencode");
  const configPath = join(configDir, "opencode.jsonc");
  const secondaryConfigDir = join(xdgConfig, "opencode");
  const secondaryConfigPath = join(secondaryConfigDir, "opencode.json");
  const sourceRoot = resolve(import.meta.dirname, "../../..");
  await mkdir(configDir, { recursive: true });
  await mkdir(secondaryConfigDir, { recursive: true });
  await writeFile(secondaryConfigPath, `{
  "plugin": ["${sourceRoot}/packages/opencode-dynovo-context/dist/index.js"]
}
`);
  await writeFile(configPath, `{
  // preserve router settings
  "default_agent": "orchestrator",
  "plugin": [
    "file://${sourceRoot}/packages/opencode-dynovo-context/dist/index.js",
    "file://${sourceRoot}/packages/opencode-dynovo-context/dist/axl-boot.mjs"
  ],
  "agent": {
    "orchestrator": {
      "mode": "primary",
      "model": "test/model",
      "prompt": "{file:${sourceRoot}/agents/orchestrator.axlr}"
    }
  }
}
`);
  const script = resolve(import.meta.dirname, "../../../bin/install-opencode-rules");
  await exec(script, ["--rules-only", "--with-context-plugin", "--activate-router"], {
    env: {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: xdgConfig,
      OPENCODE_CONFIG: configPath,
    },
  });

  const result = await readFile(configPath, "utf8");
  const deploymentRoot = join(configDir, "dynovo-agent-rules");
  assert.match(result, /\/\/ preserve router settings/);
  assert.match(result, /"default_agent": "router"/);
  assert.match(result, /"router": \{/);
  assert.match(result, new RegExp(`\\{file:${deploymentRoot}/agents/router\\.axlr\\}`));
  assert.doesNotMatch(result, /dist\/axl-boot\.mjs/);
  assert.equal(result.match(/dynovo-agent-rules\/plugin\/index\.js/g)?.length, 1);
  assert.doesNotMatch(await readFile(secondaryConfigPath, "utf8"), /dynovo-agent-rules/);
});
