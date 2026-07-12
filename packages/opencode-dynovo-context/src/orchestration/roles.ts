export const roleCapabilities: Record<string, { allowed: string[]; forbidden: string[] }> = {
  coordinator: { allowed: ["read rules", "update ledger", "delegate bounded tasks"], forbidden: ["edit production code", "self-approve implementation"] },
  planner: { allowed: ["plan", "map acceptance criteria"], forbidden: ["edit production code", "edit tests"] },
  explorer: { allowed: ["inspect repository"], forbidden: ["modify workspace"] },
  test_author: { allowed: ["edit tests and fixtures"], forbidden: ["edit production code"] },
  implementer: { allowed: ["edit assigned production scope"], forbidden: ["edit approved red tests", "weaken assertions"] },
  reviewer: { allowed: ["read and report findings"], forbidden: ["modify workspace", "self-approve implementation"] },
  UNKNOWN: { allowed: [], forbidden: ["assume permissions"] },
};

export function resolveRole(role?: string): { role: string; allowed: string[]; forbidden: string[] } {
  const normalized = role && roleCapabilities[role] ? role : "UNKNOWN";
  return { role: normalized, ...roleCapabilities[normalized]! };
}
