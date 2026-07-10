Status: needs-triage

## What to build

`AGENTS.md` declares load budgets (router <= 200, base_rules <= 300, types <= 150, domain_overlay <= 200, ledger_summary <= 150) but nothing enforces or checks them. Add a mechanism to track and verify these budgets.

Options (pick the simplest that works):
- A script under `bin/` that checks line counts against declared budgets and exits non-zero on violation
- A pre-commit hook using the same script
- A documented manual step in a verification checklist

The `ledger_summary` budget was added without a clear tracking mechanism — clarify what it applies to (which files count as "ledger summary") and ensure the check covers it.

## Acceptance criteria

- [ ] A check exists that verifies actual line counts against declared budgets
- [ ] The check covers all five budget categories in AGENTS.md
- [ ] `ledger_summary` scope is clearly defined
- [ ] Running the check on the current repo passes (or reports real violations)

## Blocked by

None — can start immediately.
