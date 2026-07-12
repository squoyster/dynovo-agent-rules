export interface CapsuleItem {
  id: string;
  text?: string;
  status?: string;
  evidence?: string;
  owner?: string;
  action?: string;
}

export interface ProtectedFailure {
  id: string;
  command: string;
  exitCode: string;
  error: string;
  hypothesisStatus: string;
  evidence: string;
}

export interface ProtectedCheckpoint {
  sessionID: string;
  checkpointID: string;
  createdAt: string;
  workspaceRoot: string;
  repository?: string;
  rulesetRoot: string;
  rulesetCommit: string;
  baseRules: string;
  activeOverlays: string[];
  ledgerPath: string;
  ledgerVersion: string;
  activeRole: string;
  activeAgentID?: string;
  delegationParent: string;
  delegatedTask: string;
  allowedActions: string[];
  forbiddenActions: string[];
  objective: string;
  status: string;
  risk: string;
  currentFocus: string;
  currentPlanID: string;
  currentGate: string;
  nextAction: string;
  constraints: CapsuleItem[];
  acceptanceCriteria: Array<CapsuleItem & { status: string; evidence: string }>;
  obligations: Array<CapsuleItem & { text: string }>;
  plan: Array<CapsuleItem & { status: string; owner: string; action: string; evidence: string }>;
  files: CapsuleItem[];
  decisions: CapsuleItem[];
  rejectedApproaches: CapsuleItem[];
  failures: ProtectedFailure[];
  verification: CapsuleItem[];
  openQuestions: CapsuleItem[];
  redactions: number;
}

export interface CapsuleOptions {
  maxChars: number;
  includeCompletedPlanItems?: number;
  includeResolvedFailures?: number;
  includeSuccessfulEvidence?: number;
}
