import { createOpenCodeAdapter } from "./opencode/adapter.js";

export default async function DynovoContextPlugin(input: { directory: string; worktree: string }, options: Record<string, unknown> = {}) {
  const adapter = await createOpenCodeAdapter({ directory: input.directory, worktree: input.worktree, config: options });
  return adapter.hooks;
}

export { createOpenCodeAdapter } from "./opencode/adapter.js";
export { parseAxls, serializeAxls } from "./axls/index.js";
