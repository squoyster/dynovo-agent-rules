type BootInput = { sessionID?: string };
type BootOutput = { system?: string[] };
type BootHooks = {
  "experimental.chat.system.transform": (input: BootInput, output: BootOutput) => Promise<void>;
};

declare const createBootHooks: () => Promise<BootHooks>;
export default createBootHooks;
