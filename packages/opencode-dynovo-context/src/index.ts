import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Hooks, Plugin } from "@opencode-ai/plugin";
import { createOpenCodeAdapter } from "./opencode/adapter.js";

type BootHooks = Pick<Hooks,
  | "dispose"
  | "event"
  | "experimental.chat.messages.transform"
  | "experimental.chat.system.transform"
>;

async function loadBootHooks(): Promise<BootHooks> {
  const module = await import("./axl-boot.mjs") as { default: () => Promise<BootHooks> };
  return module.default();
}

const DynovoContextPlugin = async (input: { directory: string; worktree: string }, options: Record<string, unknown> = {}) => {
  const adjacentRuleset = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const config = options.rulesetRoot === undefined && existsSync(resolve(adjacentRuleset, "AGENTS.md"))
    ? { ...options, rulesetRoot: adjacentRuleset }
    : options;
  const adapter = await createOpenCodeAdapter({ directory: input.directory, worktree: input.worktree, config });
  if (options.enabled === false) return adapter.hooks;
  const boot = await loadBootHooks();
  const event: NonNullable<Hooks["event"]> = async (eventInput) => {
    await adapter.hooks.event(eventInput);
    await boot.event?.(eventInput);
  };
  return { ...adapter.hooks, ...boot, event };
};

DynovoContextPlugin satisfies Plugin;

export default DynovoContextPlugin;

export { createOpenCodeAdapter } from "./opencode/adapter.js";
export { parseAxls, serializeAxls } from "./axls/index.js";
export { dispatchEnvelopeMarker, dispatchRejectionMessage, parseDispatchEnvelope, parseResultEnvelope, resultEnvelopeMarker, resultRejectionMessage, validateDispatch, validateResult, type DispatchContract, type DispatchParseResult, type DispatchResult, type DispatchViolation, type ResultParseResult } from "./orchestration/dispatch.js";
export { evaluateTransition, type TransitionDecision, type TransitionDispatch, type TransitionResult } from "./orchestration/transitions.js";
