# AGENTS.md — DOX-Min v1

Purpose: compact, agent-readable policy. Formal rules are authoritative. Prose is advisory.

## Notation

```dox
# Logic
□=always; ◇=before closeout; ¬=not; ∧=and; ∨=or; →=implies; ≺=before; ≻=higher priority; :=define; ∅=none.

# Norms
M x=must x. F x=must-not x. S x=should x unless blocked by stronger rule. P x=may x. Pref(a,b)=prefer a over b unless stronger rule blocks.

# Core vars
Repo=repo root. p=path. T=task. Δ=changed paths. d=AGENTS.md. D(p)=root→nearest AGENTS chain for p. near(p)=nearest governing AGENTS. wt=worktree. S=symbol.

# Rule shape
R[id]: scope | trigger -> norm/action [verify] [except] [effect]

# Directive schema
Dir := {scope,trigger,norm∈{M,F,S,P,Pref},action,verify?,except?,effect?}

# Priority
safety ≻ DOX_root ≻ near(p) ≻ parent(D(p)) ≻ task_instruction ≻ preference
conflict(a,b)->choose(max_priority); tie->choose(more_specific); unresolved->stop_report(conflict)
```

## Meta Rules

```dox
R000 global | nontrivial(T) -> M translate(relevant_directives(T),dox) ∧ reason_over(dox) ∧ execute(derived_plan) ∧ verify(postconditions).
R001 global | new_agent_directive(x) -> M encode_as(Dir) ∧ Pref(dox_notation,prose) ∧ allow(prose_if_human_clarity_needed).
R002 global | acting_on_directive(x) -> M parse(x) ∧ classify(x,{invariant,precondition,postcondition,permission,prohibition,preference,exception}) ∧ encode(x,dox).
R003 global | report(T) -> S include(assumptions ∧ selected_rules ∧ actions_taken ∧ verification_results ∧ unresolved_conflicts?).
R004 global | reasoning_trace -> F expose_long_chain_of_thought ∧ Pref(compact_rule_trace,deliberation_prose).
```

## DOX Adoption

```dox
R060 prose_directive(x,agent_facing) ∧ ¬already_dox(x) -> M rewrite(x,dox) ∧ keep_intent(x) ∧ keep_scope(x).
R061 doc(d,human_oriented) -> F rewrite_in_dox(d). human_oriented := {README,tutorial,guide,comment_for_people,narrative_doc}.
R062 valid_dox(x) -> P leave_unchanged(x).          # idempotent: don't churn already-DOX content.
R063 rewrite(x) -> M use(notation_in_§Notation) ∧ classify(x,{invariant,precondition,postcondition,permission,prohibition,preference,exception}) ∧ emit(R[id]: scope | trigger -> norm/action [verify] [except] [effect]).
```

## DOX Authority

```dox
R010 all | work_on(p) -> M comply(D(p)).
R011 all | artifacts(p) -> M understandable_from(D(p)).
R012 all | conflict(parent,child) -> local_detail:=child.
R013 all | weaken(child,DOX) -> invalid(child_rule).
R014 all | user_requests(durable_behavior_change) -> M record(root_AGENTS ∨ relevant_child_AGENTS).
```

## Read Before Edit

```dox
R020 edit(any) -> M read(root/AGENTS.md) ∧ P:=expected_touch_paths(T) ∧ ∀p∈P:walk(Repo→p)∧read(AGENTS_on_route)∧read(child_if_listed_and_scope_contains(p))∧set(D(p),near(p)).
R021 edit(p) -> F rely(memory,DOX) ∧ M reread(D(p),current_session).
R022 navigate(repo) -> M read(repo_indexes) ≺ select(files).
R023 routine_read -> M only(indexes ∪ changed_files ∪ directly_referenced_sources/tests ∪ relevant_docs).
R024 missing(file,indexes) -> M narrow(grep∨glob) ∧ update(index.overrides).
R025 skip_default -> M skip(archives ∪ node_modules/ ∪ build_output ∪ vendored_deps).
```

## DOX Update / Hierarchy

```dox
R030 meaningful(Δ) -> M dox_pass(Δ) before done(T).
R031 affects(Δ,{purpose,scope,ownership,responsibility,durable_structure,contract,workflow,operating_rule,input,output,permission,constraint,side_effect,artifact,user_pref,AGENTS_lifecycle,index}) -> M update(near(Δ)).
R032 affects(parent_structure∨parent_ownership∨parent_workflow∨child_index) -> M update(parent_doc).
R033 parent_change_alters(local_rules) -> M update(child_doc).
R034 stale(text)∨contradictory(text) -> M delete(text).
R035 small(Δ)∧¬changes_behavior(Δ)∧¬changes_contract(Δ) -> P leave_docs_unchanged ∧ M dox_pass.
R036 root_AGENTS -> M own(global_rules ∪ user_preferences ∪ workflow_rules ∪ top_child_index).
R037 child_AGENTS -> M own(domain_rules ∪ local_child_index).
R038 parent(d) -> M explain(direct_children ∧ parent_owned_scope).
R039 closer(d,p) -> M more_specific(d,p) ∧ more_practical(d,p).
R040 durable_boundary(folder)∧has(folder,{purpose,rules,responsibilities,workflow,materials,quality}) -> M create(folder/AGENTS.md).
R041 child_AGENTS -> S sections([Purpose,Ownership,Local Contracts,Work Guidance,Verification,Child DOX Index]).
R042 ¬specific_standards -> Work_Guidance:=∅.  ¬existing_check -> Verification:=∅.
```

## Style / Closeout

```dox
R050 docs -> M concise ∧ current ∧ operational ∧ stable_contracts_only ∧ F diary_entries.
R051 docs -> M broad_rules_in_parent ∧ concrete_details_in_child ∧ direct_bullets ∧ explicit_names.
R052 docs -> F duplicate_rules_unless_scope_needs_local_copy; M trim(obvious∨repeated∨misplaced∨obsolete_warning).
R053 closeout(T) -> M recheck(Δ,D(Δ)) ∧ update(nearest_docs∪affected_parents∪affected_children) ∧ refresh(child_indices) ∧ delete(stale∨contradictory) ∧ run(existing_verification_if_relevant) ∧ report(unchanged_docs,reason).
R053a closeout_signals(T) := any_emitted({commit,push,scp,rsync,cp_to_remote,build_for_deploy,deploy,PR_create,"done","shipped","deployed"}) ∨ any_file_edit(Δ).
R053b closeout_signals(T) -> M emit_block(`closeout`,{files_touched:[paths],dox_triggers_hit:[R-ids],dox_updated:[{path,status}],reason_if_skipped:string}).
R053c closeout_block -> M precede(final_prose) ∧ F omit ∧ F bury_in_summary.
R053d conflict(mode_output_rule,R053b) -> R053b ≻ mode_output_rule; closeout_block := structured_artifact,¬prose; mode_rules govern prose_only.
R054 response -> M terse ∧ act_then_report_briefly ∧ F restate_obvious_task ∧ F excessive_deliberation_prose.
R055 nontrivial(T) -> M plan:=ordered_steps(T) ∧ execute_in_order(plan) ∧ verify(each_step_before_next).
R056 all -> M correctness>speed ∧ read_before_edit ∧ confirm_assumptions ∧ run_gates ∧ double_check(commands∧paths).
```

## Worktrees

```dox
R070 sequential(TASK-n,TASK-n+1) -> base(TASK-n+1):=tip(TASK-n).
R071 standalone(T) -> base(T):=clean(main_HEAD).
R072 create_wt(T) -> M run(`git worktree add -b <branch> <wt_path> <base-branch>`).
R073 done(T) -> M remove_worktree(wt) ∧ if merged_or_superseded(branch) then delete(branch) ∧ if base_for_next_task(branch) then keep(branch).
```

## Gates / Commit

```dox
R090 done(T) -> M run(existing_verification_gates:typecheck∧lint∧build∧test) ≺ commit.
R091 gates -> M lint_errors=0 ∧ P preexisting_warnings ∧ F bypass(gates).
R092 code_commit -> M run(`git add -A && git commit -m "<summary>"`).
R093 push_useful -> P run(`git push -u origin <branch>`).
```

## Hard Rules / Permissions

```dox
R100 all -> F force_push.
R101 push(main,from_worktree) -> F push.
R102 edit(opencode.json[c]) -> M user_restart(opencode_required).
```

## Durable Agent Identity

```dox
R110 identity -> M authoritative(durable_state) ∧ F source_of_truth(conversation_memory∨summaries∨prompt_text) ∧ prompt_identity:=projection(durable_identity).
R111 IDs := {agentId:AgentRuntime, sessionId:ModelSession, runId:ExecutionAttempt, taskId?:DurableWorkItem, claimId?:OwnershipClaim}; Pref(UUIDv7∨ULID,other_id).
R112 before(model_call) -> M load(identity,durable_state) ∧ validate(repo∧worktree∧task∧claim_scope) ∧ inject(identity,model_context) ∧ if missing_or_inconsistent(required_identity) then refuse(identity_sensitive_work).
R113 available(agentId∧sessionId∧runId) -> M include_in(task_claims∧checkpoints∧logs∧summaries∧handoff_notes∧PR_metadata∧submission_metadata).
R114 exists(durable(agentId)) -> F regenerate(agentId). new(agentId) allowed_only_if initialize_new_identity∨explicit_fork.
R115 subagent(s) -> M own(agentId_s) ∧ explicit_parent_link(s,parent). handoff -> M include(source_identity∧target_identity).
```
