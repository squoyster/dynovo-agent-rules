# AXL agent rules

AXL-R files are executable policy. Apply matching rules; do not merely summarize them.
`{name}` is a placeholder, not literal path text.

## Boot procedure

1. Evaluate every `@DISCLOSURE` rule once, independently, top to bottom.
2. Load `D001` and `D002` first; then load only other matching disclosures.
3. In each loaded `.axlr`, scan every rule. If scope and trigger match, obey its norm.
4. `M` = must, `F` = must not, `S` = should unless blocked, `P` = may, `Pref` = prefer the named first option.
5. Never recurse through disclosure IDs or infer an unlisted load.

@DISCLOSURE
D001: router | always -> M load(axl/types.axlt)
D002: router | always -> M load(rules/base.axlr)
D003: router | touches_domain(T,D) -> M load(rules/{D}.axlr) [pre: exists_nonempty(rules/{D}.axlr)]
D004: router | touches_context_or_memory(T) -> M load(rules/context.axlr)
D005: router | edits_axl_r_or_semantics(T) -> M load(axl/spec.axlr)
D006: router | writes_axl_state(T) -> M load(axl/state-spec.axls)
D007: router | applies_axl_patch(T) -> M load(axl/patch-spec.axlp)
D008: router | translates_prose_to_axl(T) -> M load(skills/axl-encode/SKILL.md)
D009: router | translates_axl_to_prose(T) -> M load(skills/axl-humanize/SKILL.md)
D010: router | uses_gitnexus(T) -> M load(rules/gitnexus.axlr) [pre: exists(.gitnexus)]
D011: router | env(AXL_DEBUG)∈{1,true,on,rules} -> M load(rules/debug.axlr)
D090: router | always -> F load(all_files_recursively)
D091: router | routine_task(T) -> F load(axl/spec.axlr) [except: edits_axl_r_or_semantics(T)]
D092: router | domain_not_touched(T,D) -> F load(rules/{D}.axlr)

## Canonical files

- `rules/base.axlr`: default coding and operational policy
- `agents/orchestrator.axlr`: backlog selection, routing, and gate coordination
- `axl/types.axlt`: notation, modal meaning, evaluation loop, shared enums
- `axl/spec.axlr`: AXL-R grammar and authoring semantics
- `axl/state-spec.axls`: durable state and evidence format
- `axl/patch-spec.axlp`: sparse state-update format
- `.specs/Rigorous-Agentic-Development-Specification.md`: source process specification

## Load budgets

@LOAD_BUDGET
router: <= 100 lines
base_rules: <= 200 lines
types: <= 120 lines
domain_overlay: <= 120 lines each
agent_prompt: <= 100 lines each
ledger_summary: <= 150 lines each file under ledgers/

## Local workflow

Issues: `.scratch/`; tracker contract: `docs/agents/issue-tracker.md`.
Triage labels: `docs/agents/triage-labels.md`; domain model: `docs/agents/domain.md`.
Validate changes with `bin/validate-axl` before commit.
