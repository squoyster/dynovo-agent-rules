export function renderDynovoCompactionPrompt(): string {
  return `You are producing a continuation record for an active software-development
session.
The DYNOVO_PROTECTED_CONTEXT supplied with this request is authoritative for
the current task state. Preserve its active fields, identifiers, constraints,
roles, evidence references, and exact technical values.
The conversation history may contain stale, superseded, speculative, or
incorrect material. Distinguish current state from historical discussion.
Produce a compact continuation record using exactly these sections:
## Objective
## Governing Context
Include:
- ruleset root and commit
- base rules and active overlays
- active ledger path and version
- active agent role
- delegation parent and delegated task
- current gate
## Hard Constraints
Preserve all active user constraints, policy pins, prohibitions, scope limits,
acceptance criteria, and role boundaries.
## Current State
Include:
- current plan item
- completed material work
- active files
- uncommitted work
- build and test state
- active failures
- unresolved questions
## Decisions
Include only decisions that still govern future work. Preserve stable IDs.
## Rejected Approaches
Preserve rejected hypotheses or approaches when repeating them would waste work
or introduce risk.
## Evidence
Preserve test, build, lint, review, Git, command, and artifact references needed
to support completion claims.
## Delegation State
Preserve:
- coordinator task
- child-agent assignments
- returned findings
- pending child-agent work
- ownership boundaries
- reviewer independence requirements
## Next Action
Provide one concrete executable next step for the active agent.
## Recovery
State that canonical AXL-R files, the AXL-S ledger, repository contents, Git
state, and executable test evidence override this continuation summary.
Rules:
1. Do not reinterpret, weaken, or omit protected active constraints.
2. Do not change agent-role permissions.
3. Do not mark work complete without evidence.
4. Do not convert assumptions into facts.
5. Preserve exact paths, identifiers, commands, numeric values, and material
   error messages.
6. Remove obsolete tool output, conversational filler, duplicate file content,
   and superseded exploration.
7. Prefer stable references over repeated large payloads.
8. Do not invent missing state.
9. Clearly mark unresolved ambiguity.
10. Keep the result compact enough for continuation by a low-cost orchestration
model.`;
}
