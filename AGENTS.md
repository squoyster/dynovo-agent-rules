# AGENTS.md

This file routes agent behavior. Keep default-load context small.

AXL means Agent eXecution Language.

## Placeholder notation
`{name}` means a template placeholder, not literal path text.

Load order:
1. AGENTS.md
2. rules/base.axlr
3. relevant rules/{domain}.axlr only if task materially touches that domain
4. `rules/context.axlr` only when task materially touches context management, memory, retrieval, compression, handoff, or long-running agent state
5. skills/axl-humanize/SKILL.md only for AXL expansion, summarization, or fidelity checks
6. axl/spec.axlr when editing AXL rules, types, or semantics
7. axl/state-spec.axls only when writing durable ledgers or handoff files
8. `skills/axl-encode/SKILL.md` only for translating, compressing, normalizing, indexing, or converting non-AXL material into AXL
9. `rules/debug.axlr` only when `AXL_DEBUG` is enabled

Canonical files:
- rules/base.axlr: default operational rules
- rules/context.axlr: conditional context-index, compression, and recall rules
- rules/debug.axlr: conditional per-turn rule-evaluation trace
- axl/spec.axlr: full rule-language specification
- axl/types.axlt: shared symbols, value sigils, status enums
- axl/state-spec.axls: durable state/ledger file specification
- axl/patch-spec.axlp: patch/update file specification

Non-goals:
- Do not load full AXL spec for routine repo work.
- Do not duplicate canonical rules across files.
- Do not expand read set beyond the active task.
- Do not confuse AXL-R rules with AXL-S state files.

## Directive

@DIRECTIVE
At turn start: evaluate all @DISCLOSURE conditions before any other action.

## Disclosure

@DISCLOSURE
D0: always_load = AGENTS.md
D1: nontrivial(T) -> load(rules/base.axlr ∧ axl/types.axlt)
D2: touches(T,domain) -> load(rules/{domain}.axlr)
D3: resumes(T,state) ∨ handoff(T) -> load(relevant ledgers/*.axls)
D4: edits(T,AXL_rule|AXL_type|AXL_semantics|*.axlr|*.axlt) -> load(axl/spec.axlr)
D5: writes(T,ledger) -> load(axl/state-spec.axls)
D6: applies(T,patch) -> load(axl/patch-spec.axlp)
D7: touches(T,context_management|memory|retrieval|compression|handoff|long_running_agent_state) -> load(rules/context.axlr)
D8: encode(T,non_AXL->AXL) ∨ compress_to_AXL(T) ∨ normalize_to_AXL(T) -> load(skills/axl-encode/SKILL.md)
D9: env(*AXL_DEBUG)∈{1,true,on,rules} -> load(rules/debug.axlr) ∧ enable(axl_debug)
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

## Agent skills

Issues: local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.
Triage: `needs-triage|needs-info|ready-for-agent|ready-for-human|wontfix`. See `docs/agents/triage-labels.md`.
Domain: single-context. See `docs/agents/domain.md`.
