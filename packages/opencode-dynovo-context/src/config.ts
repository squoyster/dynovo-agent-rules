import { resolve } from "node:path";

export interface DynovoContextConfig {
  enabled: boolean;
  rulesetRoot?: string;
  baseRules: string;
  activeLedger: "auto" | string;
  stateDirectory: string;
  checkpointOnCompaction: boolean;
  injectCustomPrompt: boolean;
  postCompactionRecovery: boolean;
  dcpCoexistence: boolean;
  orchestrator: { enabled: boolean; defaultRole: string; requireEvidenceFromWorkers: boolean; retainChildTranscripts: boolean };
  failurePolicy: { missingLedger: "reconstruct-minimal" | "warn"; invalidLedger: "inject-raw-and-warn" | "warn"; writeFailure: "continue-with-warning" | "abort"; missingRuleset: "reference-known-state" | "warn"; unknownAgent: "mark-unknown" | "warn" };
  capsule: { maxChars: number; includeCompletedPlanItems: number; includeResolvedFailures: number; includeSuccessfulEvidence: number };
}

export const defaultConfig: DynovoContextConfig = {
  enabled: true,
  baseRules: "rules/base.axlr",
  activeLedger: "auto",
  stateDirectory: ".dynovo",
  checkpointOnCompaction: true,
  injectCustomPrompt: true,
  postCompactionRecovery: true,
  dcpCoexistence: true,
  orchestrator: { enabled: true, defaultRole: "coordinator", requireEvidenceFromWorkers: true, retainChildTranscripts: false },
  failurePolicy: { missingLedger: "reconstruct-minimal", invalidLedger: "inject-raw-and-warn", writeFailure: "continue-with-warning", missingRuleset: "reference-known-state", unknownAgent: "mark-unknown" },
  capsule: { maxChars: 24_000, includeCompletedPlanItems: 5, includeResolvedFailures: 2, includeSuccessfulEvidence: 10 },
};

export function resolveConfig(root: string, options: Partial<DynovoContextConfig> = {}): DynovoContextConfig {
  const merged = { ...defaultConfig, ...options, capsule: { ...defaultConfig.capsule, ...options.capsule }, orchestrator: { ...defaultConfig.orchestrator, ...options.orchestrator }, failurePolicy: { ...defaultConfig.failurePolicy, ...options.failurePolicy } };
  if (merged.capsule.maxChars < 1_024) throw new Error("capsule.maxChars must be at least 1024");
  if (merged.stateDirectory.includes("..")) throw new Error("stateDirectory must not traverse outside the workspace");
  return { ...merged, rulesetRoot: resolve(root, merged.rulesetRoot ?? root) };
}
