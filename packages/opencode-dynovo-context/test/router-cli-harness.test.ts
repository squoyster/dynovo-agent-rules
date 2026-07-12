import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);

test("router CLI harness verifies native output and durable transition evidence", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "dynovo-router-cli-"));
  const fakeOpenCode = join(workspace, "fake-opencode.mjs");
  await writeFile(fakeOpenCode, `#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const task = process.env.DYNOVO_INTEGRATION_TASK_ID;
const session = "ses_cli_harness";
await mkdir(join(process.cwd(), ".dynovo/state/tasks"), { recursive: true });
await writeFile(join(process.cwd(), ".dynovo/state/sessions.json"), JSON.stringify({ [session]: { activeAgentRole: "coordinator", activeAgentID: "router" } }));
await writeFile(join(process.cwd(), ".dynovo/state/tasks", session + ".axls"), [
  "@DELEGATIONS",
  "dispatch_test dispatch_id=" + task + " status=pending",
  "@EVIDENCE",
  "result_test dispatch_id=" + task + " status=PASS validation=passed",
  "@TRANSITIONS",
  "transition_test dispatch_id=" + task + " decision=accepted from=INTAKE to=DISCOVERY",
].join("\\n") + "\\n");
console.log(JSON.stringify({ type: "tool_use", sessionID: session, part: { tool: "task", state: { status: "completed", input: { prompt: "DYNOVO_DISPATCH_V1\\n{\\\"task_id\\\":\\\"" + task + "\\\"}" } } } }));
`);
  await chmod(fakeOpenCode, 0o755);

  const script = resolve(import.meta.dirname, "../../../bin/test-opencode-router-integration");
  const { stdout } = await exec(script, ["--workspace", workspace], {
    env: { ...process.env, OPENCODE_BIN: fakeOpenCode },
  });

  assert.match(stdout, /OpenCode router integration passed/);
  assert.match(stdout, /session=ses_cli_harness/);
  assert.match(stdout, /transition=INTAKE->DISCOVERY/);
});

test("router CLI harness reports OpenCode output when no native task completes", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "dynovo-router-cli-failure-"));
  const fakeOpenCode = join(workspace, "fake-opencode.mjs");
  await writeFile(fakeOpenCode, `#!/usr/bin/env node
console.log(JSON.stringify({ type: "text", part: { text: "router refused the task" } }));
`);
  await chmod(fakeOpenCode, 0o755);

  const script = resolve(import.meta.dirname, "../../../bin/test-opencode-router-integration");
  await assert.rejects(
    exec(script, ["--workspace", workspace], { env: { ...process.env, OPENCODE_BIN: fakeOpenCode } }),
    (error: unknown) => {
      assert.match(String((error as { stderr?: string }).stderr), /router refused the task/);
      return true;
    },
  );
});
