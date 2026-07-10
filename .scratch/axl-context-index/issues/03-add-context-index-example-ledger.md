Status: needs-triage

## What to build

Create `ledgers/context-index.example.axls` — a realistic example ledger demonstrating the L0-L3 memory model using valid AXL-S syntax.

The example must demonstrate:
- compact active state
- pinned constraints
- a context index
- decisions
- evidence
- artifact references
- unresolved items
- stale/fresh state
- supersession
- raw-source references
- a completed retrieval record

Represent a realistic agentic coding task. Keep index entries short — full payloads must live in durable records or referenced sources.

Note: `ledgers/example-project.axls` and `ledgers/example-task.axls` already exist. They are useful but are not the spec's deliverable. This issue adds the missing context-index example alongside them.

## Acceptance criteria

- [ ] `ledgers/context-index.example.axls` exists using valid AXL-S syntax
- [ ] All eleven elements above are demonstrated
- [ ] Index entries are short; no full payloads duplicated into the index
- [ ] Example represents a realistic agentic coding task

## Blocked by

- #01 (context.axlr should exist to demonstrate its rules in practice)
