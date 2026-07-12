import { parseAxls, type AxlsBlock, type AxlsDocument, type AxlsRecord } from "./index.js";
import type { CapsuleItem, ProtectedCheckpoint, ProtectedFailure } from "../compaction/types.js";

function records(document: AxlsDocument, block: string): AxlsRecord[] {
  return document.blocks.get(block)?.records ?? [];
}

function state(document: AxlsDocument, name: string, fallback = "UNKNOWN"): string {
  return records(document, "STATE").find((record) => record.id === name)?.fields.value ?? fallback;
}

function workflowState(document: AxlsDocument): string {
  const accepted = [...records(document, "TRANSITIONS")].reverse().find((record) => record.fields.decision === "accepted");
  return accepted?.fields.to ?? state(document, "workflow_state", "INTAKE");
}

function item(record: AxlsRecord): CapsuleItem {
  return { id: record.id, text: record.fields.value ?? record.raw, status: record.fields.status, evidence: record.fields.evidence, owner: record.fields.owner, action: record.fields.action };
}

export interface LedgerProjection {
  document: AxlsDocument;
  ledgerVersion: string;
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
  plan: Array<CapsuleItem & { status: string; owner: string; action: string; evidence: string }>;
  failures: ProtectedFailure[];
  verification: CapsuleItem[];
  decisions: CapsuleItem[];
  rejectedApproaches: CapsuleItem[];
  openQuestions: CapsuleItem[];
  delegations: Array<CapsuleItem & { status: string; owner: string; action: string; evidence: string }>;
  warnings: CapsuleItem[];
}

export function projectLedger(source: string): LedgerProjection {
  const document = parseAxls(source);
  if (!document.blocks.has("META")) throw new Error("Invalid AXL-S ledger: @META is required");
  const meta = records(document, "META");
  const version = meta.find((record) => record.id === "v")?.fields.value ?? "UNKNOWN";
  const plan = records(document, "PLAN").map((record) => ({ id: record.id, status: record.fields.status ?? "UNKNOWN", owner: record.fields.owner ?? "UNKNOWN", action: record.fields.action ?? record.raw, evidence: record.fields.evidence ?? "NONE" }));
  const criteria = records(document, "ACCEPTANCE_CRITERIA").map((record) => ({ ...item(record), status: record.fields.status ?? "TODO", evidence: record.fields.evidence ?? "NONE" }));
  const failures = records(document, "FAILURES").map((record) => ({ id: record.id, command: record.fields.command ?? "UNKNOWN", exitCode: record.fields.exit_code ?? "UNKNOWN", error: record.fields.error ?? "UNKNOWN", hypothesisStatus: record.fields.hypothesis_status ?? "unverified", evidence: record.fields.evidence ?? "NONE" }));
  const delegations = records(document, "DELEGATIONS").map((record) => ({ id: record.id, status: record.fields.status ?? "UNKNOWN", owner: record.fields.owner ?? record.fields.role ?? "UNKNOWN", action: record.fields.objective ?? record.raw, evidence: record.fields.result_ref ?? "NONE" }));
  return {
    document, ledgerVersion: version, objective: state(document, "objective"), status: state(document, "status", "TODO"), risk: state(document, "risk", "LOW"), currentFocus: state(document, "current_focus"), currentPlanID: state(document, "current_plan_id", plan.find((entry) => entry.status !== "DONE")?.id ?? "NONE"), currentGate: state(document, "current_gate", "NONE"), workflowState: workflowState(document), nextAction: state(document, "next_action", "Reload canonical state before acting"),
    constraints: records(document, "PIN").map(item), acceptanceCriteria: criteria, plan, failures,
    verification: records(document, "EVIDENCE").map(item), decisions: records(document, "DECISIONS").map(item), rejectedApproaches: records(document, "REJECTED_APPROACHES").map(item), openQuestions: records(document, "OPEN_QUESTIONS").map(item), delegations, warnings: [],
  };
}

export function minimalLedgerProjection(): LedgerProjection {
  return projectLedger("@META\nid: reconstructed\nv: UNKNOWN\nkind: axls\n\n@STATE\nobjective: UNKNOWN\nstatus: TODO\nrisk: LOW\ncurrent_focus: UNKNOWN\ncurrent_gate: NONE\nnext_action: Reload canonical state before acting\n\n@PLAN\n");
}
