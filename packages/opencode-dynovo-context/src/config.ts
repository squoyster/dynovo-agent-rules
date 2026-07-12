import { resolve } from "node:path";

export interface DynovoContextConfig {
  enabled: boolean;
  rulesetRoot?: string;
  baseRules: string;
  stateDirectory: string;
  checkpointOnCompaction: boolean;
  injectCustomPrompt: boolean;
  postCompactionRecovery: boolean;
  dcpCoexistence: boolean;
  capsule: { maxChars: number; includeCompletedPlanItems: number; includeResolvedFailures: number; includeSuccessfulEvidence: number };
}

export const defaultConfig: DynovoContextConfig = {
  enabled: true,
  baseRules: "rules/base.axlr",
  stateDirectory: ".dynovo",
  checkpointOnCompaction: true,
  injectCustomPrompt: true,
  postCompactionRecovery: true,
  dcpCoexistence: true,
  capsule: { maxChars: 24_000, includeCompletedPlanItems: 5, includeResolvedFailures: 2, includeSuccessfulEvidence: 10 },
};

export function resolveConfig(root: string, options: Partial<DynovoContextConfig> = {}): DynovoContextConfig {
  const merged = { ...defaultConfig, ...options, capsule: { ...defaultConfig.capsule, ...options.capsule } };
  if (merged.capsule.maxChars < 1_024) throw new Error("capsule.maxChars must be at least 1024");
  if (merged.stateDirectory.includes("..")) throw new Error("stateDirectory must not traverse outside the workspace");
  return { ...merged, rulesetRoot: resolve(root, merged.rulesetRoot ?? root) };
}
