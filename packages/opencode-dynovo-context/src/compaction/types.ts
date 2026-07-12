export interface CapsuleItem {
  id: string;
  text?: string | undefined;
  status?: string | undefined;
  evidence?: string | undefined;
  owner?: string | undefined;
  action?: string | undefined;
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
  repository?: string | undefined;
  rulesetRoot: string;
  rulesetCommit: string;
  baseRules: string;
  activeOverlays: string[];
  ledgerPath: string;
  ledgerVersion: string;
  activeRole: string;
  activeAgentID?: string | undefined;
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
  workflowState: string;
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
