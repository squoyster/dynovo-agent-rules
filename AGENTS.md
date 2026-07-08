# AGENTS.md

This file routes agent behavior. Keep default-load context small.

AXL means Agent eXecution Language.

Load order:
1. AGENTS.md
2. rules/base.axlr
3. relevant rules/<domain>.axlr only if task materially touches that domain
4. skills/axl-humanize/SKILL.md only for AXL expansion, summarization, or fidelity checks
5. axl/spec.axlr only when editing/extending AXL semantics
6. axl/state-spec.axls only when writing durable ledgers or handoff files

Canonical files:
- rules/base.axlr: default operational rules
- axl/spec.axlr: full rule-language specification
- axl/types.axlt: shared symbols, value sigils, status enums
- axl/state-spec.axls: durable state/ledger file specification
- axl/patch-spec.axlp: patch/update file specification

Non-goals:
- Do not load full AXL spec for routine repo work.
- Do not duplicate canonical rules across files.
- Do not expand read set beyond the active task.
- Do not confuse AXL-R rules with AXL-S state files.

## Disclosure

@DISCLOSURE
D0: always_load = AGENTS.md
D1: nontrivial(T) -> load(rules/base.axlr ∧ axl/types.axlt)
D2: touches(T,domain) -> load(rules/<domain>.axlr)
D3: resumes(T,state) ∨ handoff(T) -> load(relevant ledgers/*.axls)
D4: edits(T,AXL_semantics) -> load(axl/spec.axlr)
D5: writes(T,ledger) -> load(axl/state-spec.axls)
D6: applies(T,patch) -> load(axl/patch-spec.axlp)
F: load(all_files_recursively)
F: load(full_spec_for_routine_work)
F: load(domain_overlay_without_trigger)

## Load budget

@LOAD_BUDGET
router: <= 200 lines
base_rules: <= 300 lines
types: <= 150 lines
domain_overlay: <= 200 lines each
ledger_summary: <= 150 lines
full_spec: load only on explicit semantic task
