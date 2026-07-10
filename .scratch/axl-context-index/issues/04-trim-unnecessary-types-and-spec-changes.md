Status: needs-triage

## What to build

The spec said to update `axl/types.axlt` "only if necessary" and `axl/spec.axlr` "only for actual AXL-R language semantics." Both files were modified during the AXL restructure. Evaluate whether the changes are actually required by `rules/context.axlr` and the context-index feature, or whether they are speculative.

For `axl/types.axlt`: the added enums (`priority`, `freshness`, `record_status`, `context_kind`) may be needed by context-index records. Verify whether each is referenced by context.axlr or the example ledger. Remove any that are not.

For `axl/spec.axlr`: verify that any added operators, priorities, or rule syntax are actual AXL-R language semantics, not repository-level conventions that belong in rules or state specs. Move repository-level conventions to the appropriate rules file; keep only language semantics in the spec.

## Acceptance criteria

- [ ] Every enum in `axl/types.axlt` is referenced by at least one rule or example that needs it
- [ ] `axl/spec.axlr` contains only AXL-R language semantics, not repo conventions
- [ ] No removed symbol breaks any rule in `rules/base.axlr` or `rules/context.axlr`
- [ ] File budgets are respected (types <= 150 lines)

## Blocked by

- #01 (need context.axlr to determine what's actually necessary)
