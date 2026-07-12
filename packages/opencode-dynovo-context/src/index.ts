import { createOpenCodeAdapter } from "./opencode/adapter.js";

type BootInput = { sessionID?: string };
type BootOutput = { system?: string[] };
type BootHooks = {
  "experimental.chat.system.transform": (input: BootInput, output: BootOutput) => Promise<void>;
};

async function loadBootHooks(): Promise<BootHooks> {
  const module = await import("./axl-boot.mjs") as { default: () => Promise<BootHooks> };
  return module.default();
}

export default async function DynovoContextPlugin(input: { directory: string; worktree: string }, options: Record<string, unknown> = {}) {
  const adapter = await createOpenCodeAdapter({ directory: input.directory, worktree: input.worktree, config: options });
  return { ...adapter.hooks, ...(await loadBootHooks()) };
}

export { createOpenCodeAdapter } from "./opencode/adapter.js";
export { parseAxls, serializeAxls } from "./axls/index.js";
