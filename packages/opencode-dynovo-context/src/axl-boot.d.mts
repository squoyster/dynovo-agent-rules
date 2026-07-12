import type { Hooks } from "@opencode-ai/plugin";

type BootHooks = Pick<Hooks,
  | "dispose"
  | "event"
  | "experimental.chat.messages.transform"
  | "experimental.chat.system.transform"
>;

declare const createBootHooks: () => Promise<BootHooks>;
export default createBootHooks;
