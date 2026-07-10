# AGENTS.md
If you are seeing this then AXL is critical for your success.
FOLLOW ALL DIRECTIVES TO THE LETTER.  EACH RULE IS POTENTIALLY
AN EXECUTION INSTRUCTION THAT IS CRITICAL TO THIS PROJECT.
ALL EXECUTION INSTRUCTIONS MUST BE EVALUATED WHEN ENCOUNTERED.

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
- axl/types.axlt: types used elsewhere
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
evaluate all @DISCLOSURE conditions before any other action.

## Disclosure
RBOOT000: start(T) -> M process(D0)

@DISCLOSURE
D0: always_load = AGENTS.md ∧ process(D1)
D1: nontrivial(T) -> load(rules/base.axlr ∧ axl/types.axlt) ∧ process(D2)
D2: touches(T,domain) -> load(rules/{domain}.axlr)
D3: resumes(T,state) ∨ handoff(T) -> load(relevant ledgers/*.axls) ∧ process(D3)
D4: edits(T,AXL_rule|AXL_type|AXL_semantics|*.axlr|*.axlt) -> load(axl/spec.axlr) ∧ process(D4)
D5: writes(T,ledger) -> load(axl/state-spec.axls) ∧ process(D5)
D6: applies(T,patch) -> load(axl/patch-spec.axlp) ∧ process(D6)
D7: touches(T,context_management|memory|retrieval|compression|handoff|long_running_agent_state) -> load(rules/context.axlr) ∧ process(D8)
D8: encode(T,non_AXL->AXL) ∨ compress_to_AXL(T) ∨ normalize_to_AXL(T) -> load(skills/axl-encode/SKILL.md) ∧ process(D9)
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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **dynovo-agent-rules** (86 symbols, 78 relationships, 0 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/dynovo-agent-rules/context` | Codebase overview, check index freshness |
| `gitnexus://repo/dynovo-agent-rules/clusters` | All functional areas |
| `gitnexus://repo/dynovo-agent-rules/processes` | All execution flows |
| `gitnexus://repo/dynovo-agent-rules/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
