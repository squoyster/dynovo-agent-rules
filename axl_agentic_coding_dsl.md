# AXL — Agent eXecution Language

> **Non-canonical mirror.** Edit [axl_agentic_coding_dsl_complete.md](./axl_agentic_coding_dsl_complete.md) as the source of truth. This file exists as a convenience alias and should be kept in sync.

A compact DSL for formalizing agentic coding behavior.

AXL is intended for `AGENTS.md`, agent role definitions, MCP validators, repo-local policy files, and compressed run-state artifacts. It is inspired by DOX-Min / dynovo-agent-rules style symbolic rules, but generalized beyond repository policy into full agentic coding execution: planning, context control, edits, verification, evidence, handoff, and self-improvement.

---

## 1. Purpose

AXL exists to reduce:

- Context usage
- Ambiguous prose instructions
- Agent drift from acceptance criteria
- Unverified claims
- Unsafe edits
- Repeated failure patterns
- Handoff loss between planner, implementer, reviewer, and tester agents

AXL optimizes for:

- Compression
- Correctness
- Mechanical validation
- Framework portability
- Traceability
- Self-improvement

Target environments include:

- OpenCode
- Codex-style agents
- Claude Code-style agents
- Cursor / IDE agents
- Hermes-like agent systems
- Custom MCP-based coding harnesses
- Headroom-style compression systems

---

## 2. Design Principles

1. **Rules over prose**  
   Use formal, scoped, compact rules instead of long natural-language instructions.

2. **Explicit modality**  
   Distinguish must, must-not, should, may, and preference.

3. **Evidence before claims**  
   Any implementation-relevant claim must be backed by file, command, test, user, tool, or explicit assumption evidence.

4. **Acceptance criteria are first-class**  
   Every acceptance criterion should map to implementation steps and verification gates.

5. **Context is managed, not accumulated**  
   Agents should explicitly read, pin, summarize, and drop context.

6. **Verification is required before done**  
   A task is not done until relevant acceptance criteria and gates are satisfied, blocked, or honestly reported.

7. **Self-improvement is local first**  
   Repeated failures should produce repo-local or project-local rules before global agent behavior is modified.

---

## 3. Core Notation

```text
# Modal operators
M x       := must do x
F x       := must not do x
S x       := should do x unless blocked by stronger rule
P x       := may do x
Pref(a,b) := prefer a over b unless blocked

# Temporal / dependency operators
a ≺ b     := a before b
a ≻ b     := a higher priority than b
a ∥ b     := a may run in parallel with b
a ⇢ b     := a produces input for b
a ⊢ b     := a justifies b
◇x        := eventually before closeout
□x        := invariant / always

# Logic
¬         := not
∧         := and
∨         := or
→         := implies
∀         := for all
∃         := exists
∈         := member of
∅         := none
```

---

## 4. Rule Shape

Canonical rule form:

```text
R[id]: scope | trigger -> norm action [pre] [read] [verify] [except] [effect] [emit]
```

Expanded schema:

```text
Rule := {
  id,
  scope,
  trigger,
  norm ∈ {M,F,S,P,Pref},
  action,
  pre?,
  read?,
  verify?,
  except?,
  effect?,
  emit?
}
```

Example:

```text
R020: repo | edit(p) -> M read(policy_chain(p)) ≺ edit(p) [verify: policy_loaded(p)]
```

Meaning: before editing path `p`, the agent must read the applicable policy chain for `p` and verify that the policy was loaded.

---

## 5. Domain Objects

```text
T       := task
AC      := acceptance criterion
Repo    := repository root
p       := path
Δ       := changed paths
S       := symbol
Cmd     := shell command
Tool    := external tool, MCP, API, or connector
Ctx     := context payload
Ev      := evidence
Plan    := ordered task plan
Step    := plan step
Patch   := file modification
Gate    := verification gate
Claim   := assertion made by agent
Risk    := possible failure mode
State   := durable project/agent state
Mem     := memory item
```

Typed paths:

```text
src(p)      := source file
test(p)     := test file
doc(p)      := documentation file
cfg(p)      := config file
secret(p)   := secrets-bearing file
gen(p)      := generated file
vend(p)     := vendored dependency
```

Common predicates:

```text
edit(p)
create(p)
delete(p)
move(p,q)
run(Cmd)
call(Tool)
commit
push
deploy
closeout(T)
handoff(T,a,b)
```

---

## 6. Priority Model

Default precedence:

```text
safety ≻ platform_policy ≻ user_instruction ≻ repo_policy ≻ local_policy ≻ task_AC ≻ agent_pref
```

Conflict resolution:

```text
conflict(a,b) -> choose(max_priority)
tie -> choose(more_specific)
unresolved -> stop_report(conflict)
```

Required rule:

```text
R-P0: all | conflict(norms) -> M emit(conflict_block) ∧ F silently_choose_low_confidence
```

Agents must not silently resolve high-impact conflicts by guessing.

---

## 7. Execution Phases

```text
Φ0 := intake
Φ1 := orient
Φ2 := plan
Φ3 := implement
Φ4 := verify
Φ5 := report
Φ6 := improve
```

Phase rules:

```text
R100: T | start(T) -> M Φ0≺Φ1≺Φ2≺Φ3≺Φ4≺Φ5
R101: T | trivial(T) -> P skip(Φ2_detail) [verify: risk_low]
R102: T | nontrivial(T) -> M Plan:=steps(T,AC) ∧ map(AC,Step)
R103: T | implement(T) -> M each(Step).verify ≺ next(Step)
R104: T | closeout(T) -> M verify(AC) ∧ report(Δ,gates,risks)
```

---

## 8. Acceptance Criterion Mapping

Acceptance criteria should be explicitly mapped to steps, files, tests, and evidence.

```text
ACM := map(AC_i -> {steps, files, tests, evidence})
```

Rules:

```text
R120: T | has(AC) -> M create(ACM) ≺ implement(T)
R121: closeout(T) -> M verify(∀AC_i: satisfied∨blocked) ∧ emit(ACM_result)
R122: AC_i unsatisfied -> F report(done)
```

Compact output block:

```text
acm{
  AC1 -> steps[S2,S4], files[a.java,b.test], gates[test:pass]
  AC2 -> steps[S3], files[c.ts], gates[typecheck:pass]
}
```

This prevents the common agent failure mode where implementation drifts from the requested outcome.

---

## 9. Evidence Model

Evidence shape:

```text
Ev := {
  kind ∈ {file, cmd, test, log, issue, pr, web, user, inference, assumption},
  ref,
  claim,
  confidence ∈ [0,1]
}
```

Rules:

```text
R130: Claim(c) | affects_code -> M backed_by(Ev) ∨ mark(assumption)
R131: assumption(c) ∧ high_impact(c) -> M verify(c) ∨ ask_or_stop(c)
R132: report(c) -> F present(assumption_as_fact)
```

Compact syntax:

```text
E[file:src/Auth.java#L40-L75] ⊢ Claim(auth_flow_uses_jwt)
E[cmd:mvn-test:pass] ⊢ Claim(gates_pass)
A[framework_is_spring] confidence=.7
```

Evidence classes:

```text
E[file:p#Lx-Ly]      := file evidence
E[cmd:name:status]   := command evidence
E[test:name:pass]    := test evidence
E[user:statement]    := direct user evidence
E[tool:name:output]  := external tool evidence
A[text]              := explicit assumption
I[text]              := inference
```

---

## 10. Read-Set and Context Control

Definitions:

```text
ReadSet(T) := minimal files/docs needed for T
PinSet(T)  := facts that must remain in context
DropSet(T) := content safe to discard/summarize
```

Rules:

```text
R140: orient(T) -> M compute(ReadSet(T)) ∧ F read(unbounded_repo)
R141: edit(p) -> M read(p ∪ tests_for(p) ∪ policy_chain(p))
R142: large(file) -> S summarize(file) ∧ pin(symbol_index(file))
R143: repeated_content(x) -> M replace_with(ref(x))
R144: after_step(S) -> M update(PinSet) ∧ drop(nonessential_context)
```

Compact declaration:

```text
ctx{
  read: [src/AuthService.java, test/AuthServiceTest.java, AGENTS.md]
  pin: [AuthService.login contract, JWT expiry rule]
  drop: [full dependency tree, unrelated controllers]
}
```

This is intended to reduce token usage while preserving correctness-critical state.

---

## 11. Tool and Permission Model

Permission values:

```text
Perm := allow | ask | deny
```

Tool shape:

```text
ToolSpec := {
  name,
  input,
  output,
  side_effect ∈ {none, fs, net, db, git, deploy},
  permission ∈ {allow, ask, deny},
  verify?
}
```

Rules:

```text
R150: call(Tool) -> M check(permission(Tool, action))
R151: side_effect(Tool)>none -> M emit(tool_intent) ≺ call(Tool)
R152: destructive(action) -> M require(explicit_user_or_policy_allow)
R153: tool_result(x) -> M validate(schema(x)) ∧ handle(error(x))
```

Examples:

```text
TOOL[grep]: side_effect=none perm=allow
TOOL[git_push]: side_effect=git perm=ask
TOOL[deploy_prod]: side_effect=deploy perm=deny unless user_explicit
```

---

## 12. Patch Semantics

Patch shape:

```text
Patch := {
  target,
  op ∈ {insert, replace, delete, move, rename},
  reason,
  linked_AC?,
  verify?
}
```

Rules:

```text
R160: patch(p) -> M linked_to(T.intent ∨ AC ∨ defect)
R161: patch(p) -> F unrelated_refactor unless explicit
R162: delete(code) -> M prove(unused ∨ superseded ∨ requested)
R163: modify(public_contract) -> M update(tests ∧ docs ∧ callers)
```

Compact patch block:

```text
Δ{
  replace src/AuthService.java:login reason=AC1 verify=AuthServiceTest
  add test/AuthServiceTest.java:testExpiredJwt reason=AC2
}
```

---

## 13. Verification Gates

Gate shape:

```text
Gate := {
  name,
  cmd?,
  scope,
  required ∈ {M,S,P},
  pass_condition,
  fallback?
}
```

Rules:

```text
R170: closeout(T) -> M run(relevant_gates(T))
R171: gate_fail(g) -> F claim(done) ∧ M fix_or_report(g)
R172: unable_run(g) -> M report(reason ∧ risk ∧ substitute_evidence?)
R173: changed_tests -> M run(changed_tests)
R174: changed_api -> M run(contract_tests ∨ integration_tests)
```

Compact gate block:

```text
gates{
  unit: mvn test -> pass
  type: npm run typecheck -> pass
  lint: npm run lint -> pass|preexisting_warn
}
```

---

## 14. Agent Roles

Role values:

```text
Role := planner | implementer | reviewer | tester | refactorer | researcher | release
```

Role rules:

```text
R180: role(planner) -> F edit(files) ∧ M output(Plan,ACM,Risk)
R181: role(implementer) -> M consume(Plan) ∧ implement(mapped_steps) ∧ F expand_scope
R182: role(reviewer) -> M compare(Δ,ACM,rules,gates) ∧ emit(findings)
R183: handoff(a,b) -> M include(summary ∧ Δ ∧ open_risks ∧ next_steps)
```

Example planner contract:

```text
ROLE planner{
  F edit(*)
  M read(task ∧ relevant_policy)
  M output(plan ∧ ACM ∧ risks ∧ gates ∧ open_questions)
}
```

Example implementer contract:

```text
ROLE implementer{
  M consume(plan)
  M execute(mapped_steps)
  M patch_only(linked_to_AC_or_defect)
  M verify(gates)
  F expand_scope unless user_explicit
}
```

Example reviewer contract:

```text
ROLE reviewer{
  M inspect(Δ)
  M compare(Δ,ACM,rules,gates)
  M report(findings:{blocking,nonblocking,notes})
  F modify unless reviewer_fix_mode
}
```

---

## 15. Agent State and Identity

Identity shape:

```text
ID := {
  agentId,
  sessionId,
  runId,
  taskId?,
  claimId?
}
```

Rules:

```text
R190: start(run) -> M load(ID ∧ State) ∧ validate(repo,branch,task)
R191: new(run) -> M create(runId) ∧ F regenerate(agentId)
R192: checkpoint -> M write(State:{phase,plan,Δ,gates,risks})
R193: handoff -> M include(ID ∧ checkpoint ∧ unresolved)
```

Durable state shape:

```text
State := {
  id,
  phase,
  task,
  plan,
  changed_paths,
  evidence,
  gates,
  risks,
  unresolved,
  next
}
```

---

## 16. Self-Improvement Loop

Metrics:

```text
Metric := token_cost | wall_time | tool_calls | edit_count | gate_failures | rework | defect_escape | user_correction
```

Rules:

```text
R200: closeout(T) -> S eval_run(T,Metric)
R201: repeated_failure(pattern,n≥2) -> M propose(rule_or_skill_update)
R202: improvement -> M prefer(local_rule) over global_rule unless broadly_reusable
R203: proposed_rule -> M include(trigger,action,verify,evidence)
R204: improvement_rule -> F optimize_tokens_at_cost(correctness)
```

Improvement block:

```text
improve{
  obs: test discovery cost high
  cause: no test index
  rule+: R-test-index: repo | missing(test_map) -> M build(test_index)
  expected: -30% read tokens, fewer missed tests
}
```

---

## 17. Context Compression Extensions

Symbols:

```text
Σ := summary
κ := checksum/hash/ref
π := pinned invariant
```

Rules:

```text
R210: summarize(x) -> M preserve(contracts ∧ symbols ∧ decisions ∧ risks ∧ TODOs)
R211: compressed(x) -> M attach(ref ∧ scope ∧ freshness)
R212: stale(Σ) -> M refresh_before_use
R213: high_risk_detail -> F summarize_without_exact_value
```

Compressed summary shape:

```text
Σ[src/AuthService.java]{
  κ=sha256:abcd
  exports=[login, refreshToken]
  contracts=[throws AuthException on expired JWT]
  risks=[clock skew behavior]
}
```

Pinned invariant shape:

```text
π[auth_contract]: expired JWT must fail closed; valid JWT must preserve existing refresh behavior
```

Compression policy:

```text
compress{
  preserve: [public contracts, data model shape, error semantics, security-sensitive values]
  summarize: [large unchanged files, dependency trees, repeated logs]
  drop: [irrelevant search results, superseded plans, duplicate tool output]
  refresh_before_use: [summaries older than changed file hash]
}
```

---

## 18. Suggested File Layout

Repo-local layout:

```text
AGENTS.md
.agent/
  axl.md              # DSL notation and global semantics
  rules.axl           # project rules
  roles/
    planner.axl
    implementer.axl
    reviewer.axl
  indexes/
    symbols.axl
    tests.axl
    ownership.axl
  runs/
    <runId>.axl
```

Single-file variant:

```text
# AGENTS.md

## AXL Notation
...

## Global Rules
R000...
R001...

## Role Contracts
ROLE planner...
ROLE implementer...

## Closeout Block
closeout{...}
```

---

## 19. Concrete AXL Example

```text
AXL v0.1

priority:
  safety ≻ platform ≻ user ≻ repo ≻ local ≻ task ≻ pref

vars:
  Repo, T, AC, Δ, p, Cmd, Ev, Gate, State

roles:
  planner:
    F edit(*)
    M output(plan ∧ acm ∧ risks ∧ gates)

  implementer:
    M consume(plan)
    M map(AC,Step)
    F expand_scope unless user_explicit

rules:
  R001: all | nontrivial(T) -> M plan(T) ≺ edit(*) [verify: plan_has_ACM]
  R002: edit(p) -> M read(policy_chain(p) ∧ p ∧ tests_for(p))
  R003: patch(p) -> M linked_to(AC ∨ defect ∨ explicit_user_request)
  R004: closeout(T) -> M run(relevant_gates(T)) ∧ verify(∀AC)
  R005: gate_fail(g) -> F claim(done) ∧ M fix_or_report(g)
  R006: conflict(a,b) -> M choose(max_priority) ∨ stop_report(conflict)
  R007: report(T) -> M emit(closeout_block)

closeout_schema:
  closeout{
    task:
    files_touched:
    acm:
    gates:
    risks:
    docs_updated:
    unresolved:
  }
```

---

## 20. Compact Canonical Form

For production prompts, define short aliases:

```text
@P := priority
@R := rule
@G := gate
@C := context
@E := evidence
@D := delta
@O := output
```

Dense example:

```text
@R R4 repo|edit(p)->M read(chain(p),p,test(p))≺patch(p)
@R R5 repo|close(T)->M gates(T)∧AC✓∧emit(close)
@R R6 repo|fail(g)->F done ∧ M fix∨report
```

This compact form is suitable for high-frequency agent context where every token matters.

---

## 21. Recommended Extensions to DOX-Min-Style Rules

### 21.1 Acceptance Mapping

```text
R-AC1: T | has(AC) -> M map(AC_i -> Step_j ∧ Gate_k) ≺ implement(T)
R-AC2: closeout(T) -> M emit(AC_status:{pass,fail,blocked,untested})
```

### 21.2 Evidence-Backed Claims

```text
R-EV1: Claim(c) | affects_decision -> M backed_by(Ev) ∨ mark(assumption)
R-EV2: assumption(c)∧high_impact -> M verify(c) ∨ stop_report(c)
```

### 21.3 Context Budgets

```text
R-CTX1: T | context_pressure -> M compress(noncritical) ∧ pin(contracts ∧ decisions ∧ risks)
R-CTX2: read(repo) -> F exhaustive_read unless task_requires
R-CTX3: summary(x) -> M include(scope ∧ freshness ∧ preserved_facts)
```

### 21.4 Role Separability

```text
R-ROLE1: planner -> F edit ∧ M output(plan,ACM,gates,risks)
R-ROLE2: implementer -> M consume(plan) ∧ F reinterpret_AC_without_evidence
R-ROLE3: reviewer -> M compare(Δ,ACM,rules,gates)
```

### 21.5 Token-Cost Telemetry

```text
R-MET1: closeout(T) -> S record(tokens_in,tokens_out,tool_calls,read_files,gates,rework)
R-MET2: high_cost_pattern -> M propose(compression_rule ∨ index ∨ skill)
```

### 21.6 Failure-Pattern Learning

```text
R-LEARN1: repeated(error_signature,n≥2) -> M add(rule_or_check)
R-LEARN2: new_rule -> M include(trigger,action,verify,expected_benefit)
```

### 21.7 Machine-Parseable Closeout

```text
closeout{
  runId:
  taskId:
  Δ:
  AC:
  gates:
  evidence:
  unresolved:
  next:
  improve?:
}
```

---

## 22. MCP Additions

Recommended MCP tools:

| MCP tool | Purpose |
|---|---|
| `axl.parse` | Parse `.axl` / `AGENTS.md` rules into AST |
| `axl.lint` | Detect malformed, duplicate, conflicting, or unreachable rules |
| `axl.resolve` | Given `task + paths`, return governing rules |
| `axl.plan_check` | Validate that a plan covers all acceptance criteria |
| `axl.patch_check` | Validate patch paths against rule scope and permissions |
| `axl.gate_select` | Select relevant test/build/lint commands |
| `axl.closeout_check` | Validate final report has required fields |
| `axl.compress` | Convert verbose instructions into AXL |
| `axl.expand` | Render AXL into human-readable prose |
| `axl.learn` | Propose new rule from failure telemetry |
| `axl.trace` | Produce compact rule/action/evidence trace |

Example request:

```json
{
  "task": "Add expired JWT rejection behavior",
  "paths": ["src/AuthService.java"],
  "changed": ["src/AuthService.java", "test/AuthServiceTest.java"],
  "acceptance": ["expired JWT rejected", "valid JWT accepted"],
  "phase": "verify"
}
```

Example response:

```json
{
  "required_rules": ["R001", "R002", "R004"],
  "required_gates": ["unit", "typecheck"],
  "missing": ["AC map for expired JWT"],
  "blocking": true
}
```

---

## 23. Minimal Viable AXL v0.1 Spec

```text
AXL v0.1

# Operators
M=must; F=must-not; S=should; P=may; Pref(a,b)=prefer a over b.
≺=before; ≻=priority; ∧=and; ∨=or; ¬=not; →=implies; ∀=all; ∃=exists.

# Rule
R[id]: scope | trigger -> norm action [pre] [read] [verify] [except] [effect] [emit]

# Priority
safety ≻ platform ≻ user ≻ repo ≻ local ≻ task ≻ preference
conflict(a,b)->choose(max_priority); tie->more_specific; unresolved->stop_report(conflict)

# Required objects
T=task; AC=acceptance criterion; p=path; Δ=changed paths; Ev=evidence; Gate=verification gate; State=durable state.

# Global rules
R000: all | start(T) -> M classify(T:{trivial,nontrivial,risky})
R001: nontrivial(T) -> M plan(T) ∧ map(AC,Step,Gate) ≺ edit(*)
R002: edit(p) -> M read(policy_chain(p) ∧ p ∧ relevant_tests(p)) ≺ patch(p)
R003: patch(p) -> M linked_to(AC ∨ defect ∨ explicit_request)
R004: claim(c) -> M backed_by(Ev) ∨ mark(assumption)
R005: assumption(c)∧high_impact(c) -> M verify(c) ∨ stop_report(c)
R006: closeout(T) -> M run(relevant_gates(T)) ∧ verify(∀AC)
R007: gate_fail(g) -> F claim(done) ∧ M fix_or_report(g)
R008: context_pressure -> M compress(noncritical) ∧ pin(contracts ∧ decisions ∧ risks)
R009: repeated_failure(pattern,n≥2) -> S propose(rule_update)
R010: report(T) -> M emit(closeout{Δ,AC,gates,evidence,risks,unresolved})
```

---

## 24. Production Starter Template

```text
AXL v0.1

@P safety ≻ platform ≻ user ≻ repo ≻ local ≻ task ≻ pref

@R R000 all|start(T)->M classify(T:{trivial,nontrivial,risky})
@R R001 nontrivial(T)->M plan(T)∧map(AC,Step,Gate)≺edit(*)
@R R002 edit(p)->M read(policy_chain(p)∧p∧relevant_tests(p))≺patch(p)
@R R003 patch(p)->M linked_to(AC∨defect∨explicit_request)
@R R004 claim(c)->M backed_by(Ev)∨mark(assumption)
@R R005 assumption(c)∧high_impact(c)->M verify(c)∨stop_report(c)
@R R006 closeout(T)->M run(relevant_gates(T))∧verify(∀AC)
@R R007 gate_fail(g)->F claim(done)∧M fix_or_report(g)
@R R008 context_pressure->M compress(noncritical)∧pin(contracts∧decisions∧risks)
@R R009 repeated_failure(pattern,n≥2)->S propose(rule_update)
@R R010 report(T)->M emit(closeout{Δ,AC,gates,evidence,risks,unresolved})

ROLE planner{
  F edit(*)
  M output(plan∧ACM∧risks∧gates)
}

ROLE implementer{
  M consume(plan)
  M execute(mapped_steps)
  F expand_scope unless user_explicit
}

ROLE reviewer{
  M compare(Δ,ACM,rules,gates)
  M emit(findings:{blocking,nonblocking,notes})
}

closeout{
  task:
  Δ:
  AC:
  gates:
  evidence:
  risks:
  unresolved:
  improve?:
}
```

---

## 25. Bottom Line

AXL should remain small, boring, and checkable.

The highest-value extensions beyond base rule notation are:

1. Acceptance criterion mapping
2. Evidence-backed claims
3. Read / pin / drop context control
4. Patch semantics
5. Role contracts
6. Verification-gate schemas
7. Machine-parseable closeout
8. Telemetry-backed self-improvement
9. MCP validators for parse, lint, resolve, trace, and learn

The core value is not novelty. It is converting fragile prompt prose into compact, scoped, priority-resolved, verifiable rules that coding agents can follow and external tools can validate.

---

## 26. AXL Human Translator Skill

AXL should include a dedicated skill for translating compact agentic rules into human-friendly language on request. The goal is to make the DSL safe to use in compressed form while preserving auditability for humans.

### 26.1 Skill Name

```text
axl-humanize
```

Alternative aliases:

```text
axl.explain
axl.expand
axl.translate
rules.humanize
```

### 26.2 Purpose

Translate AXL rules, plans, closeout blocks, traces, or compressed policy snippets into clear natural language without changing their meaning.

The skill is intentionally one-way by default:

```text
AXL -> human explanation
```

A reverse translation mode may exist, but should be separate and stricter:

```text
human prose -> AXL candidate
```

### 26.3 Activation Triggers

Use this skill when the user asks for any of the following:

```text
explain this rule
translate this AXL
make this human-readable
expand the DSL
what does this mean
summarize the policy in plain English
convert this AGENTS.md rule to prose
explain what the agent is required to do
```

Formal trigger rule:

```text
R-HUM1: request(human_readable(x)) -> M invoke(axl-humanize,x)
```

### 26.4 Inputs

```text
HumanizeInput := {
  content: AXL | rule_block | closeout | trace | plan | mixed_markdown,
  audience?: developer | junior_dev | reviewer | manager | user,
  detail?: terse | normal | detailed,
  preserve_ids?: true | false,
  include_implications?: true | false,
  include_examples?: true | false
}
```

Defaults:

```text
audience=developer
detail=normal
preserve_ids=true
include_implications=true
include_examples=false
```

### 26.5 Output Modes

```text
mode=plain       # direct prose
mode=table       # rule-by-rule table
mode=annotated   # original AXL with inline explanation
mode=checklist   # operational checklist
mode=diff        # meaning changes between two AXL snippets
```

Recommended default:

```text
mode=table for multiple rules
mode=plain for one rule
```

### 26.6 Translation Contract

The translator must preserve:

```text
- Rule IDs
- Modal force: M/F/S/P/Pref
- Scope
- Trigger
- Required action
- Ordering constraints
- Exceptions
- Verification requirements
- Effects / emitted outputs
- Priority implications
```

It must not:

```text
- Weaken MUST into SHOULD
- Convert SHOULD into MUST
- Omit exceptions
- Omit verification gates
- Merge rules if meaning changes
- Invent unstated permissions
- Hide unresolved conflicts
```

Formal rules:

```text
R-HUM2: translate(rule) -> M preserve(id,scope,trigger,norm,action,verify,except,effect)
R-HUM3: norm(M) -> M render_as_required
R-HUM4: norm(F) -> M render_as_forbidden
R-HUM5: norm(S) -> M render_as_recommended_not_required
R-HUM6: norm(P) -> M render_as_allowed_not_required
R-HUM7: missing(parse(rule)) -> M mark(unparsed) ∧ F guess_silently
R-HUM8: conflict(rules) -> M explain(conflict ∧ priority_resolution ∨ unresolved)
```

### 26.7 Modal Translation Table

| AXL | Human wording | Meaning |
|---|---|---|
| `M x` | “The agent must x.” | Required. Noncompliance is an error. |
| `F x` | “The agent must not x.” | Forbidden. |
| `S x` | “The agent should x unless there is a stronger reason not to.” | Recommended default. |
| `P x` | “The agent may x.” | Permitted, not required. |
| `Pref(a,b)` | “Prefer a over b unless blocked by a higher-priority rule.” | Tie-break preference. |
| `a ≺ b` | “a must happen before b.” | Ordering constraint. |
| `a ≻ b` | “a has higher priority than b.” | Priority relation. |
| `a ⊢ b` | “a supports or justifies b.” | Evidence relation. |
| `◇x` | “x must happen eventually before closeout.” | Eventual obligation. |
| `□x` | “x must always hold.” | Invariant. |

### 26.8 Rule Translation Template

For each rule, output:

```text
Rule: R[id]
Applies when: <scope and trigger>
Requirement: <must / must not / should / may>
Plain English: <one to three sentences>
Verification: <how compliance is checked>
Exceptions: <exceptions if present, otherwise “None stated”>
Operational effect: <what the agent should do differently>
```

Compact table form:

```text
| Rule | Applies when | Human meaning | Verification | Exceptions |
|---|---|---|---|---|
```

### 26.9 Example Translation

Input:

```text
R002: edit(p) -> M read(policy_chain(p) ∧ p ∧ relevant_tests(p)) ≺ patch(p)
```

Output:

```text
Rule R002 means: before modifying any file, the agent must first read the policy chain that governs that file, the file itself, and the relevant tests. Only after that read step may it create a patch.

Operationally, this prevents blind edits and reduces the chance that the agent violates local instructions or breaks existing behavior.
```

### 26.10 Checklist Mode

AXL:

```text
R001: nontrivial(T) -> M plan(T) ∧ map(AC,Step,Gate) ≺ edit(*)
R004: claim(c) -> M backed_by(Ev) ∨ mark(assumption)
R006: closeout(T) -> M run(relevant_gates(T)) ∧ verify(∀AC)
```

Checklist output:

```text
Before editing:
- Create a plan for the task.
- Map each acceptance criterion to implementation steps and verification gates.

During work:
- Do not make unsupported claims.
- Back claims with evidence or explicitly label them as assumptions.

Before closeout:
- Run the relevant verification gates.
- Confirm every acceptance criterion is satisfied, blocked, or explicitly untested.
```

### 26.11 Annotated Mode

Input:

```text
R007: gate_fail(g) -> F claim(done) ∧ M fix_or_report(g)
```

Annotated output:

```text
R007: gate_fail(g)
# When a verification gate fails...

-> F claim(done)
# The agent must not claim the task is complete.

∧ M fix_or_report(g)
# The agent must either fix the failing gate or report the failure clearly.
```

### 26.12 Reverse Translation Guardrails

If translating human prose into AXL, the skill should produce a candidate, not silently claim canonical correctness.

```text
R-HUM9: prose_to_AXL(x) -> M emit(candidate_rules) ∧ M list(assumptions)
R-HUM10: ambiguity(x) -> M preserve_ambiguity ∨ ask_if_blocking
R-HUM11: candidate_rule -> M include(confidence ∧ source_text)
```

Example:

```text
Human: “The agent should usually run tests before finishing.”

AXL candidate:
R-CAND1: closeout(T) -> S run(relevant_tests(T)) [source: “should usually run tests before finishing”; confidence=.86]

Notes:
- “Should usually” maps to S, not M.
- “Tests” is interpreted as relevant tests, not the full test suite.
```

### 26.13 MCP Tool Addition

Add an MCP tool:

```text
axl.humanize
```

Request:

```json
{
  "content": "R002: edit(p) -> M read(policy_chain(p) ∧ p ∧ relevant_tests(p)) ≺ patch(p)",
  "mode": "plain",
  "audience": "developer",
  "detail": "normal",
  "preserve_ids": true,
  "include_implications": true
}
```

Response:

```json
{
  "items": [
    {
      "id": "R002",
      "plain": "Before modifying any file, the agent must read the governing policy chain, the file itself, and relevant tests. Only after that may it patch the file.",
      "modal_force": "must",
      "verification": "Check that required read operations occurred before the patch.",
      "exceptions": []
    }
  ],
  "warnings": []
}
```

### 26.14 Skill File Template

For frameworks that support skills, create:

```text
skills/axl-humanize/SKILL.md
```

Suggested content:

```markdown
# AXL Humanize Skill

Use this skill when asked to explain, expand, translate, annotate, or summarize AXL rules or agentic coding DSL blocks in human-friendly language.

## Goal

Translate compact AXL into clear prose while preserving exact rule meaning.

## Must Preserve

- Rule IDs
- Modal force: M/F/S/P/Pref
- Scope and trigger
- Ordering constraints
- Exceptions
- Verification requirements
- Effects and emitted outputs
- Priority implications

## Must Not Do

- Do not weaken MUST into SHOULD.
- Do not strengthen SHOULD into MUST.
- Do not omit exceptions.
- Do not omit verification gates.
- Do not invent permissions.
- Do not silently resolve ambiguous or malformed rules.

## Default Behavior

For one rule, provide a direct explanation.
For multiple rules, use a table.
For execution-oriented requests, produce a checklist.
For debugging or review, use annotated mode.

## Output Template

Rule: <id>
Applies when: <scope / trigger>
Requirement: <required / forbidden / recommended / permitted>
Plain English: <translation>
Verification: <compliance check>
Exceptions: <exceptions or none stated>
Operational effect: <how the agent behavior changes>

## Reverse Translation

When converting prose to AXL, emit candidate rules with assumptions and confidence. Do not claim the result is canonical unless validated by the user or an AXL linter.
```

### 26.15 Recommended Addition to Global AXL Rules

Add this to the core DSL rules:

```text
R011: request(human_readable(x)) -> M translate_AXL_to_prose(x) [preserve: id,norm,scope,trigger,verify,except,effect]
R012: translate_AXL_to_prose(x) -> F change_semantics(x)
R013: malformed_AXL(x) -> M report(parse_error) ∧ F guess_silently
```

This keeps the DSL compact for agents but recoverable for humans on demand.

---

## 27. PSTL — Prefix-Stable Temporal Ledger

PSTL is an AXL extension for organizing agent context temporally while preserving stable, semantic prefixes. The goal is to let agents grow context in a way that supports maximum matching prefix retrieval, compact resumption, deterministic handoff, and Headroom-style compression.

### 27.1 Problem

Most agent transcripts are append-only but not structurally useful. They preserve chronology, but not semantic addressability.

Unstructured context makes it difficult to answer:

- What is the current task state?
- Which facts are durable?
- Which facts were superseded?
- Which files, symbols, tests, and acceptance criteria are linked?
- Which part of the transcript is relevant to the current phase?
- What is safe to summarize or discard?

PSTL treats context as a typed, append-only, prefix-stable ledger.

### 27.2 Core Invariant

```text
shared_prefix(a,b) ≈ shared_context_semantics(a,b)
```

Nearby keys should represent related agent state. A prefix query should retrieve the semantically relevant slice.

Bad:

```text
ctx://run/123/item/001
ctx://run/123/item/002
ctx://run/123/item/003
```

Better:

```text
ctx://repo/<repo>/task/<task>/phase/<phase>/artifact/<type>/<name>
```

### 27.3 Context Record

Each context item is an immutable record.

```text
CtxRec := {
  key,
  t,
  seq,
  type,
  scope,
  payload|ref,
  summary?,
  hash,
  parent?,
  supersedes?,
  evidence?,
  freshness?
}
```

Example:

```text
ctxrec{
  key: ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001/phase/02-plan/artifact/plan/main#00042
  t: 2026-06-27T14:08:21Z
  seq: 00042
  type: plan
  scope: task
  hash: sha256:...
  payload: ...
}
```

Records are append-only. Corrections append a new record with `supersedes`; they do not mutate prior records.

```text
supersedes: ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001/phase/02-plan/artifact/plan/main#00042
```

### 27.4 Canonical Prefix Key

Recommended full key:

```text
ctx://<authority>/<project>/<workspace>/<task>/<run>/<phase>/<stream>/<kind>/<id>#<seq>
```

Concrete example:

```text
ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001/phase/03-implement/stream/code/kind/patch/id/rules-base#00037
```

Compact prompt form:

```text
C.repo.dynovo.main.T.axl-dsl.R.20260627-001.P3.impl.code.patch.rules-base#37
```

### 27.5 Key Dimensions

| Dimension | Purpose |
|---|---|
| `authority` | `user`, `repo`, `system`, `tool`, `web`, `memory`, `policy` |
| `project` | Stable repo/project identifier |
| `workspace` | Branch, worktree, container, environment, or local workspace |
| `task` | Task slug, issue ID, PR ID, ticket ID, or explicit task ID |
| `run` | Agent execution run |
| `phase` | Intake, orient, plan, implement, verify, report, improve |
| `stream` | User, agent, tool, file, test, decision, risk, code, review |
| `kind` | Plan, patch, command, result, summary, invariant, gate, evidence |
| `id` | Semantic object ID |
| `seq` | Monotonic temporal order |

The left side should be stable and coarse. The right side should be specific and temporal.

### 27.6 Ordering Principle

Use this order:

```text
authority > project > workspace > task > run > phase > stream > artifact > sequence
```

General rule:

```text
stable identity before volatile time before fine detail
```

Bad:

```text
ctx://20260627/repo/dynovo/task/axl-dsl/...
```

Better:

```text
ctx://repo/dynovo/task/axl-dsl/run/20260627-001/...
```

Date-first keys fragment retrieval across time. They are only appropriate when the primary query domain is time.

### 27.7 Temporal Layers

Context should grow in layers.

```text
L0: immutable policy / system / role
L1: project standing context
L2: task context
L3: run context
L4: phase context
L5: artifact / event context
L6: raw tool / file payloads
```

Example:

```text
L0 ctx://policy/axl/v0.1
L1 ctx://repo/dynovo-agent-rules/main/invariant/build-system
L2 ctx://repo/dynovo-agent-rules/main/task/axl-dsl/spec
L3 ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001
L4 ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001/phase/02-plan
L5 ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001/phase/02-plan/artifact/acm
L6 ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001/phase/02-plan/tool/grep#0041
```

Agents should keep compact L0-L3 summaries and pins. They should compress, hash, or evict L5-L6 raw payloads when context pressure rises.

### 27.8 Prefix-Stable Append Policy

Once emitted, a context key must not change meaning.

```text
R-PSTL-001: ctx | create(CtxRec) -> M key(prefix_stable ∧ semantic ∧ temporal_suffix)
R-PSTL-002: ctx | update(x) -> F mutate(x) ∧ M append(x') ∧ x'.supersedes=x
R-PSTL-003: ctx | summarize(prefix) -> M summary_key=prefix+"/summary/"+window
R-PSTL-004: ctx | retrieve(q) -> M use(longest_matching_prefix(q))
R-PSTL-005: ctx | conflict(records) -> M prefer(newer_superseding_record) ∧ retain(history)
```

### 27.9 Maximum Matching Prefix Retrieval

Given a query key:

```text
ctx://repo/dynovo-agent-rules/main/task/axl-dsl/run/20260627-001/phase/04-verify/gate/unit
```

The retriever attempts:

```text
1. exact key
2. ctx://repo/.../phase/04-verify/gate/
3. ctx://repo/.../phase/04-verify/
4. ctx://repo/.../run/20260627-001/
5. ctx://repo/.../task/axl-dsl/
6. ctx://repo/.../main/
7. ctx://repo/dynovo-agent-rules/
```

Return shape:

```json
{
  "matched_prefix": "ctx://repo/.../phase/04-verify/",
  "records": [],
  "summaries": [],
  "pins": [],
  "staleness": null,
  "holes": []
}
```

This lets an agent ask for a narrow thing while falling back to broader context when exact records are unavailable.

### 27.10 Window Summaries

For long tasks, append raw events but periodically emit summarized windows.

```text
ctx://repo/x/task/y/run/z/window/0000-0049/summary
ctx://repo/x/task/y/run/z/window/0050-0099/summary
ctx://repo/x/task/y/run/z/window/0100-0149/summary
```

Each summary should preserve:

```text
summary{
  prefix:
  seq_range:
  hash_range:
  decisions:
  invariants:
  changed_files:
  open_risks:
  unresolved_questions:
  superseded:
  next_required:
}
```

Rules:

```text
R-PSTL-010: seq_count(prefix)>N -> M emit(window_summary(prefix,range))
R-PSTL-011: summary -> M include(decisions ∧ invariants ∧ risks ∧ file_refs ∧ gate_status)
R-PSTL-012: raw_payload_large -> M store_by_hash ∧ replace_context_with(ref ∧ summary)
```

### 27.11 Event Log and Current State

Do not require agents to recover state by replaying the full event log.

Maintain both:

```text
event_log := append-only historical records
state_view := compact current snapshot
```

Example:

```text
ctx://repo/x/task/y/run/z/events/#0001
ctx://repo/x/task/y/run/z/events/#0002
ctx://repo/x/task/y/run/z/state/current#0010
```

`state/current` is append-only too:

```text
ctx://repo/x/task/y/run/z/state/current#0010
ctx://repo/x/task/y/run/z/state/current#0020
ctx://repo/x/task/y/run/z/state/current#0030
```

Latest records supersede previous records.

Rules:

```text
R-PSTL-020: after(phase) -> M emit(state/current#seq)
R-PSTL-021: resume(run) -> M load(latest_state ∧ unresolved ∧ pins) before raw_history
```

### 27.12 Pinning Policy

Pinned context should be tiny and durable.

```text
pin{
  task_intent:
  AC:
  constraints:
  policy_conflicts:
  decisions:
  file_contracts:
  open_risks:
  next_step:
}
```

Do not pin:

```text
full logs
full diffs
full files
tool chatter
failed exploratory branches unless they affect future decisions
```

Rules:

```text
R-PSTL-030: pin(x) -> M x ∈ {intent,AC,constraint,decision,contract,risk,next}
R-PSTL-031: pin(raw_log ∨ full_file) -> F unless small_or_critical
```

### 27.13 AXL PSTL Rules

Canonical AXL extension:

```text
# PSTL: Prefix-Stable Temporal Ledger

CtxRec := {key,t,seq,type,scope,payload|ref,summary?,hash,parent?,supersedes?,evidence?,freshness?}

Key := ctx://<authority>/<project>/<workspace>/<task>/<run>/<phase>/<stream>/<kind>/<id>#<seq>

R300: ctx | create(CtxRec) -> M key(prefix_stable ∧ semantic ∧ temporal_suffix)
R301: ctx | update(x) -> F mutate(x) ∧ M append(x') ∧ x'.supersedes=x
R302: ctx | retrieve(q) -> M use(longest_matching_prefix(q))
R303: ctx | context_pressure -> M load(pins ∧ latest_state ∧ summaries) ≺ raw_history
R304: ctx | seq_count(prefix)>N -> M emit(window_summary(prefix,range))
R305: summary(s) -> M preserve(decisions ∧ invariants ∧ risks ∧ AC ∧ Δ ∧ gates ∧ next)
R306: after(phase) -> M emit(state/current#seq)
R307: resume(run) -> M load(latest_state ∧ unresolved ∧ pins)
R308: stale(summary) -> M refresh_before_reliance
R309: conflict(records) -> M prefer(newer_superseding_record) ∧ retain(history)
R310: key(x) -> F date_first unless time_query_domain
R311: crosscut(x) -> M add(index_edge) ∧ F duplicate_payload
```

### 27.14 Human-Friendly Example

Verbose transcript:

```text
I looked at the project instructions. Then I found the auth service. Then I searched tests.
I decided the bug is in JWT expiry handling. I modified AuthService.java and added a test.
The first test run failed because the clock was mocked incorrectly. I fixed the mock.
Now unit tests pass.
```

PSTL form:

```text
ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/01-orient/stream/file/kind/read/id/agents-md#0001
ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/01-orient/stream/file/kind/read/id/auth-service#0002
ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/01-orient/stream/file/kind/read/id/auth-tests#0003

ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/02-plan/stream/decision/kind/root-cause/id/jwt-expiry-clock#0004

ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/03-implement/stream/code/kind/patch/id/auth-service#0005
ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/03-implement/stream/code/kind/patch/id/auth-tests#0006

ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/04-verify/stream/test/kind/fail/id/unit#0007
ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/03-implement/stream/code/kind/patch/id/clock-mock#0008
ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/04-verify/stream/test/kind/pass/id/unit#0009

ctx://repo/app/main/task/jwt-expiry/run/20260627-001/state/current#0010
```

Latest state:

```text
state/current#0010{
  intent: fix JWT expiry validation
  AC: [expired token rejected, valid token accepted]
  Δ: [AuthService.java, AuthServiceTest.java]
  decisions: [expiry bug caused by clock source mismatch]
  gates: [unit:pass]
  risks: []
  next: closeout
}
```

A maximum-prefix query for:

```text
ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/04-verify/
```

returns only verification records and relevant summaries.

A broader query for:

```text
ctx://repo/app/main/task/jwt-expiry/
```

returns task-level state, all run summaries, and open unresolved items.

### 27.15 Secondary Indexes for Cross-Cutting Context

Do not over-optimize for prefix matching by forcing graph-shaped relationships into a tree.

Some context is cross-cutting:

```text
same file touched by multiple tasks
same decision affects multiple modules
same risk applies to several phases
same test verifies multiple ACs
```

Use the prefix tree for primary storage and secondary indexes for graph edges:

```text
idx://file/src/AuthService.java -> [ctx keys...]
idx://symbol/AuthService.login -> [ctx keys...]
idx://AC/AC1 -> [ctx keys...]
idx://gate/unit -> [ctx keys...]
idx://risk/clock-skew -> [ctx keys...]
```

Rule:

```text
R-PSTL-040: relation_crosscuts_prefix -> M add(index_edge) ∧ F duplicate_payload
```

### 27.16 MCP Additions for PSTL

#### `ctx.put`

Append a context record.

```json
{
  "key": "ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/03-implement/stream/code/kind/patch/id/auth-service#0005",
  "type": "patch",
  "payload": "...",
  "hash": "sha256:..."
}
```

#### `ctx.get_prefix`

Retrieve by longest matching prefix.

```json
{
  "query": "ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/04-verify/gate/unit",
  "mode": "longest_prefix",
  "include": ["pins", "state", "summaries"],
  "max_tokens": 4000
}
```

#### `ctx.summarize_prefix`

Create or refresh a summary.

```json
{
  "prefix": "ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/03-implement/",
  "preserve": ["decisions", "patches", "risks", "gates", "AC"]
}
```

#### `ctx.state_current`

Return latest current state for a task or run.

```json
{
  "prefix": "ctx://repo/app/main/task/jwt-expiry/run/20260627-001/",
  "include_superseded": false
}
```

#### `ctx.diff_state`

Compare two temporal states.

```json
{
  "from": "ctx://repo/app/main/task/jwt-expiry/run/20260627-001/state/current#0010",
  "to": "ctx://repo/app/main/task/jwt-expiry/run/20260627-001/state/current#0020"
}
```

#### `ctx.lint_keys`

Detect bad key layout:

```text
date-first keys
ambiguous IDs
missing phase
missing sequence
mutated records
orphan supersedes
excessive raw payload
```

### 27.17 Headroom-Style Compression Integration

Headroom-like retrieval by hash can coexist with PSTL:

```text
PSTL key -> summary + hash refs
hash -> raw payload
```

Example:

```text
ctxrec{
  key: ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/03-implement/stream/code/kind/patch/id/auth-service#0005
  type: patch
  summary: "Changed AuthService to use injected Clock for JWT expiry."
  ref: headroom://sha256:abcd...
}
```

The agent prompt carries only:

```text
key
summary
hash/ref
preserved invariants
```

Raw content is hydrated only when needed.

This avoids nested huge artifacts while preserving exact recoverability.

### 27.18 Practical Storage Layout

Minimal file-backed version:

```text
.agent/context/
  ledger.ndjson
  state/
    current.json
  summaries/
    repo__task__run__phase.md
  index/
    by_file.json
    by_symbol.json
    by_ac.json
    by_gate.json
```

Each `ledger.ndjson` line:

```json
{
  "key": "ctx://repo/app/main/task/jwt-expiry/run/20260627-001/phase/03-implement/stream/code/kind/patch/id/auth-service#0005",
  "t": "2026-06-27T14:12:00Z",
  "type": "patch",
  "summary": "Changed AuthService to use injected Clock for JWT expiry.",
  "hash": "sha256:abcd",
  "refs": ["src/AuthService.java"],
  "ac": ["AC1"],
  "gates": ["unit"]
}
```

SQLite/PostgreSQL version:

```sql
context_records(
  key text primary key,
  prefix text,
  t timestamptz,
  seq bigint,
  type text,
  scope text,
  payload_ref text,
  summary text,
  hash text,
  parent_key text,
  supersedes_key text,
  freshness timestamptz
)

context_edges(
  src_key text,
  edge_type text,
  dst text
)
```

Indexes:

```sql
create index on context_records(prefix);
create index on context_records(t);
create index on context_edges(edge_type, dst);
```

Longest-prefix matching can be implemented with normalized prefix columns or a trie. A simple relational fallback:

```sql
select *
from context_records
where $query like key || '%'
   or key like $query || '%'
order by length(key) desc, t desc;
```

### 27.19 Operational Benefits

#### Token reduction

Agents load:

```text
latest_state + pins + relevant prefix summaries
```

instead of whole transcripts. On long tasks, expected context reduction is often large because raw logs, diffs, and command output are replaced by summaries and refs.

#### Correctness

The ledger preserves:

```text
what was known
when it was known
what superseded it
what evidence supported it
which phase produced it
```

#### Resume robustness

A resumed agent can load:

```text
ctx://repo/x/task/y/run/z/state/current
```

without replaying irrelevant history.

#### Multi-agent handoff

Planner, implementer, reviewer, and tester agents can share the same keyspace:

```text
phase/02-plan/
phase/03-implement/
phase/04-verify/
phase/05-review/
```

The reviewer can retrieve the implementer's exact patch and gate context by prefix.

### 27.20 Recommended Addition to Global AXL Rules

Add these rules to the core DSL:

```text
R300: ctx | create(CtxRec) -> M key(prefix_stable ∧ semantic ∧ temporal_suffix)
R301: ctx | update(x) -> F mutate(x) ∧ M append(x') ∧ x'.supersedes=x
R302: ctx | retrieve(q) -> M use(longest_matching_prefix(q))
R303: ctx | context_pressure -> M load(pins ∧ latest_state ∧ summaries) ≺ raw_history
R304: ctx | seq_count(prefix)>N -> M emit(window_summary(prefix,range))
R305: summary(s) -> M preserve(decisions ∧ invariants ∧ risks ∧ AC ∧ Δ ∧ gates ∧ next)
R306: after(phase) -> M emit(state/current#seq)
R307: resume(run) -> M load(latest_state ∧ unresolved ∧ pins)
R308: stale(summary) -> M refresh_before_reliance
R309: conflict(records) -> M prefer(newer_superseding_record) ∧ retain(history)
R310: key(x) -> F date_first unless time_query_domain
R311: crosscut(x) -> M add(index_edge) ∧ F duplicate_payload
```

### 27.21 Summary

The recommended context architecture is:

```text
append-only temporal ledger
+ semantic prefix-stable keys
+ current-state snapshots
+ periodic prefix summaries
+ hash-backed raw payloads
+ secondary graph indexes
+ longest-prefix retrieval
```

This gives agents compact, recoverable, cache-friendly memory. It also gives compression systems a stable way to replace large artifacts with refs while preserving deterministic retrieval.

---

## 28. Consolidated Minimal Rule Pack

For compact embedding in `AGENTS.md`, use this reduced pack.

```text
AXL v0.1 + Humanize + PSTL

M=must; F=must-not; S=should; P=may; Pref(a,b)=prefer a over b.
≺=before; ≻=priority; ∧=and; ∨=or; ¬=not; →=implies; ∀=all; ∃=exists.

R[id]: scope | trigger -> norm action [pre] [read] [verify] [except] [effect] [emit]

priority: safety ≻ platform ≻ user ≻ repo ≻ local ≻ task ≻ preference
conflict(a,b)->choose(max_priority); tie->more_specific; unresolved->stop_report(conflict)

T=task; AC=acceptance criterion; p=path; Δ=changed paths; Ev=evidence; Gate=verification gate; State=durable state; CtxRec=context record.

R000: all | start(T) -> M classify(T:{trivial,nontrivial,risky})
R001: nontrivial(T) -> M plan(T) ∧ map(AC,Step,Gate) ≺ edit(*)
R002: edit(p) -> M read(policy_chain(p) ∧ p ∧ relevant_tests(p)) ≺ patch(p)
R003: patch(p) -> M linked_to(AC ∨ defect ∨ explicit_request)
R004: claim(c) -> M backed_by(Ev) ∨ mark(assumption)
R005: assumption(c)∧high_impact(c) -> M verify(c) ∨ stop_report(c)
R006: closeout(T) -> M run(relevant_gates(T)) ∧ verify(∀AC)
R007: gate_fail(g) -> F claim(done) ∧ M fix_or_report(g)
R008: context_pressure -> M compress(noncritical) ∧ pin(contracts ∧ decisions ∧ risks)
R009: repeated_failure(pattern,n≥2) -> S propose(rule_update)
R010: report(T) -> M emit(closeout{Δ,AC,gates,evidence,risks,unresolved})

R011: request(human_readable(x)) -> M translate_AXL_to_prose(x) [preserve: id,norm,scope,trigger,verify,except,effect]
R012: translate_AXL_to_prose(x) -> F change_semantics(x)
R013: malformed_AXL(x) -> M report(parse_error) ∧ F guess_silently

R300: ctx | create(CtxRec) -> M key(prefix_stable ∧ semantic ∧ temporal_suffix)
R301: ctx | update(x) -> F mutate(x) ∧ M append(x') ∧ x'.supersedes=x
R302: ctx | retrieve(q) -> M use(longest_matching_prefix(q))
R303: ctx | context_pressure -> M load(pins ∧ latest_state ∧ summaries) ≺ raw_history
R304: ctx | seq_count(prefix)>N -> M emit(window_summary(prefix,range))
R305: summary(s) -> M preserve(decisions ∧ invariants ∧ risks ∧ AC ∧ Δ ∧ gates ∧ next)
R306: after(phase) -> M emit(state/current#seq)
R307: resume(run) -> M load(latest_state ∧ unresolved ∧ pins)
R308: stale(summary) -> M refresh_before_reliance
R309: conflict(records) -> M prefer(newer_superseding_record) ∧ retain(history)
R310: key(x) -> F date_first unless time_query_domain
R311: crosscut(x) -> M add(index_edge) ∧ F duplicate_payload
```
