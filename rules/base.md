# rules/base.md

Purpose: default operational rules for this repo. Keep this file small enough for routine agent loading. Full language rationale and extended schemas live in `../axl_agentic_coding_dsl_complete.md`.

## Notation

```axl
M x=must x. F x=must-not x. S x=should x unless stronger rule blocks. P x=may x. Pref(a,b)=prefer a over b unless stronger rule blocks.
≺=before. ≻=priority. ∧=and. ∨=or. ¬=not. →=implies. ∀=for all. ∃=exists.

T=task. AC=acceptance criterion. p=path. Δ=changed paths. Ev=evidence. Gate=verification gate. State=durable state. CtxRec=context record.
R[id]: scope | trigger -> norm action [pre] [read] [verify] [except] [effect] [emit]

safety ≻ platform_policy ≻ user_instruction ≻ repo_policy ≻ local_policy ≻ task_AC ≻ preference
conflict(a,b)->choose(max_priority); tie->choose(more_specific); unresolved->stop_report(conflict)
```

## Core execution

```axl
R000: all | start(T) -> M classify(T:{trivial,nontrivial,risky}).
R001: nontrivial(T) -> M plan(T) ∧ map(AC,Step,Gate) ≺ edit(*).
R002: trivial(T) -> P compress(plan_detail) [verify: low_risk].
R003: implement(T) -> M verify(each_step) ≺ next_step.
R004: report(T) -> M state(assumptions ∧ actions ∧ verification ∧ unresolved?).
```

## Read-set and context control

```axl
R010: all | work_on(p) -> M read(root/AGENTS.md) ∧ comply(governing_rules(p)).
R011: edit(p) -> M read(p ∧ relevant_tests(p) ∧ governing_rules(p)) ≺ patch(p).
R012: navigate(repo) -> M compute(ReadSet(T)) ∧ F read(unbounded_repo).
R013: routine_read -> M prefer(indexes ∪ changed_files ∪ directly_referenced_sources ∪ directly_referenced_tests ∪ relevant_docs).
R014: repeated_content(x) -> M replace_with(ref(x)).
R015: large(file) -> S summarize(file) ∧ pin(contracts ∧ symbols ∧ decisions ∧ risks).
R015a: summarize(source) ∨ humanize(source_summary) -> M read(../skills/axl-humanize/SKILL.md) ∧ apply(fact_kernel_workflow) ≺ rewrite.
R016: after_step(Step) -> M update(PinSet) ∧ drop(nonessential_context).
R017: edit(p) -> F rely_on(stale_memory_for_rules) ∧ M reread(governing_rules(p),current_session).
```

## Human-readable translation

```axl
R018: request(human_readable(x)) -> M read(../skills/axl-humanize/SKILL.md) ∧ translate_AXL_to_prose(x) [preserve: id,norm,scope,trigger,verify,except,effect].
R019: translate_AXL_to_prose(x) -> F change_semantics(x).
R019a: malformed_AXL(x) -> M report(parse_error) ∧ F guess_silently.
```

## Acceptance criteria and evidence

```axl
R020: has(AC) -> M create(ACM:=map(AC_i -> {steps,files,gates,evidence})) ≺ implement(T).
R021: closeout(T) -> M verify(∀AC_i:satisfied∨blocked) ∧ emit(ACM_result).
R022: AC_i unsatisfied -> F report(done).
R023: claim(c) ∧ affects_code -> M backed_by(Ev) ∨ mark(assumption).
R024: assumption(c) ∧ high_impact(c) -> M verify(c) ∨ ask_or_stop(c).
R025: report(c) -> F present(assumption_as_fact).
```

## Context ledger and resumability

```axl
R026: ctx | create(CtxRec) -> M key(prefix_stable ∧ semantic ∧ temporal_suffix).
R027: ctx | update(x) -> F mutate(x) ∧ M append(x') ∧ x'.supersedes=x.
R028: ctx | retrieve(q) -> M use(longest_matching_prefix(q)).
R029: ctx | context_pressure -> M load(pins ∧ latest_state ∧ summaries) ≺ raw_history.
R029a: ctx | seq_count(prefix)>N -> M emit(window_summary(prefix,range)).
R029b: summary(s) -> M preserve(decisions ∧ invariants ∧ risks ∧ AC ∧ Δ ∧ gates ∧ next ∧ pinned_facts?).
R029c: after(phase) -> M emit(state/current#seq).
R029d: resume(run) -> M load(latest_state ∧ unresolved ∧ pins).
R029e: stale(summary) -> M refresh_before_reliance.
R029f: conflict(records) -> M prefer(newer_superseding_record) ∧ retain(history).
R029g: key(x) -> F date_first unless time_query_domain.
R029h: crosscut(x) -> M add(index_edge) ∧ F duplicate_payload.
```

## Patch and scope discipline

```axl
R030: patch(p) -> M linked_to(AC ∨ defect ∨ explicit_user_request).
R031: patch(p) -> F unrelated_refactor unless explicit.
R032: delete(code) -> M prove(unused ∨ superseded ∨ requested).
R033: modify(public_contract) -> M update(callers ∧ tests ∧ docs).
R034: meaningful(Δ) -> M update(relevant_rules_docs) before closeout(T).
R035: stale(text) ∨ contradictory(text) -> M delete(text).
R036: duplicate(rule_text) -> F keep unless narrower_scope_requires_copy.
```

## Verification and closeout

```axl
R040: closeout(T) -> M run(relevant_gates(T)).
R041: gate_fail(g) -> F claim(done) ∧ M fix_or_report(g).
R042: unable_run(g) -> M report(reason ∧ risk ∧ substitute_evidence?).
R043: changed_tests -> M run(changed_tests).
R044: changed_api -> M run(contract_tests ∨ integration_tests).
R045: done(T) -> M run(existing_verification_gates:typecheck∧lint∧build∧test) ≺ commit [except: gate_not_relevant].
R046: gates -> M bypass=0 ∧ P preexisting_warnings.
R047: closeout(T) -> M emit(closeout{Δ,AC,gates,evidence,risks,docs_updated,unresolved,next?}).
```

## Permissions and destructive actions

```axl
R050: call(Tool) -> M check(permission(Tool,action)).
R051: side_effect(action)>none -> M emit(tool_intent) ≺ act(action).
R052: destructive(action) -> M require(explicit_user_or_policy_allow).
R053: all -> F force_push unless explicit_user_request ∧ platform_policy_allows.
R054: edit(opencode.json[c]) -> M tell_user_restart_if_required.
```

## Document roles in this repo

```axl
R060: AGENTS.md -> M own(root_routing ∧ read_order ∧ canonical_file_map).
R061: rules/base.md -> M own(default_operational_rules).
R062: rules/<domain>.md -> M own(domain_specific_overlays_only).
R063: axl_agentic_coding_dsl_complete.md -> M own(full_spec ∧ rationale ∧ examples ∧ extension_patterns ∧ humanize_rules ∧ PSTL_rules).
R064: doc(human_oriented) -> F force_axl_if_plain_prose_is_clearer.
```
