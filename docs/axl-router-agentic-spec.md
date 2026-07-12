# AXL Router-Controlled Agentic Development Specification

## 1. Purpose

This specification defines a low-cost, small-context **AXL Router** as the primary OpenCode agent.

The Router is the authoritative control-plane agent for software-development work. It owns the development state machine, interprets user authority, selects legal state transitions, chooses the appropriate specialist agent and model tier, supplies the exact required AXL rule bundle, validates returned evidence, and alone advances global workflow state.

The Router is intentionally not the strongest reasoning or coding model. It delegates complex reasoning, detailed planning, implementation, research, and review to stronger specialist models when needed.

---

## 2. Core Architecture

```text
User
  |
  v
AXL Router (cheap, compact control-plane model)
  |
  +--> Explorer / Scout
  |
  +--> Step Planner (stronger model when needed)
  |
  +--> Test Author
  |
  +--> Implementer
  |
  +--> Reviewer
  |
  +--> Validator
  |
  v
Router validates evidence and advances state
```

The architecture separates:

- **Control plane:** Router
- **Reasoning plane:** Step planners and specialist models
- **Execution plane:** Test authors and implementers
- **Verification plane:** Reviewers and validators
- **Policy plane:** AXL rule bundles selected and delivered by the Router

---

## 3. Router Role

### 3.1 Primary Description

The AXL Router is the primary OpenCode agent and authoritative owner of the AXL development state machine.

It is optimized for low-cost, low-context, deterministic coordination. It does not perform complex planning, broad repository reasoning, implementation, or independent review when a qualified specialist agent exists.

The Router:

1. Interprets the current user request.
2. Distinguishes active user instructions from historical plans, summaries, logs, backlog entries, tool output, and prior-agent proposals.
3. Determines whether inspection, planning, execution, review, or mutation is authorized.
4. Maintains the authoritative workflow state.
5. Allows only legal state transitions.
6. Selects the smallest sufficient agent and model tier.
7. Delegates complex or uncertain reasoning to a stronger step-planner model.
8. Supplies each delegated agent with the required AXL policy bundle.
9. Defines allowed actions, forbidden actions, acceptance criteria, evidence requirements, and completion boundaries.
10. Validates returned evidence.
11. Advances, blocks, retries, replans, or escalates the workflow.
12. Alone declares global workflow-state transitions and integration readiness.

### 3.2 Compact OpenCode Description

```text
Authoritative AXL development-state router. Classifies the current request, enforces legal workflow transitions and gates, selects the smallest sufficient agent and model tier, supplies the exact required AXL rule bundle, validates returned evidence, and alone advances global task state.
```

---

## 4. Router Authority

The Router owns:

```text
request classification
user-authority interpretation
workflow state
transition selection
agent selection
model-tier selection
role assignment
policy projection
gate validation
evidence acceptance
scope-change handling
integration readiness
completion declaration
```

The Router delegates:

```text
local discovery
external research
complex planning
test authoring
production implementation
independent review
mechanical validation
```

The Router must not:

```text
treat historical context as current authorization
dispatch mutating work without current user authorization
waive mandatory gates
advance state without required evidence
allow subagents to advance global workflow state
perform delegated production implementation when a qualified executor exists
perform independent review of its own accepted result
```

---

## 5. Development State Machine

### 5.1 Canonical States

```text
INTAKE
DISCOVERY
SPECIFICATION
BASELINE_READY
RED_REQUIRED
RED_ESTABLISHED
IMPLEMENTATION
GREEN_ESTABLISHED
REVIEW
VALIDATION
INTEGRATION_READY
COMPLETE
BLOCKED
```

### 5.2 Typical Behavioral-Change Path

```text
INTAKE
  -> DISCOVERY
  -> SPECIFICATION
  -> BASELINE_READY
  -> RED_REQUIRED
  -> RED_ESTABLISHED
  -> IMPLEMENTATION
  -> GREEN_ESTABLISHED
  -> REVIEW
  -> VALIDATION
  -> INTEGRATION_READY
  -> COMPLETE
```

### 5.3 Non-Implementation Paths

Status report:

```text
INTAKE -> COMPLETE
```

Repository inspection:

```text
INTAKE -> DISCOVERY -> COMPLETE
```

External research:

```text
INTAKE -> DISCOVERY -> COMPLETE
```

Documentation-only change:

```text
INTAKE
  -> SPECIFICATION
  -> IMPLEMENTATION
  -> REVIEW
  -> VALIDATION
  -> COMPLETE
```

### 5.4 State Ownership

Only the Router may advance global workflow state.

Subagents may return:

```text
PASS
FAIL
BLOCKED
SCOPE_CHANGE
POLICY_EXPANSION_REQUIRED
EVIDENCE
```

Subagents may not declare:

```text
RED_ESTABLISHED
GREEN_ESTABLISHED
REVIEW_PASSED
INTEGRATION_READY
COMPLETE
```

The Router validates the evidence and makes those determinations.

---

## 6. User-Authority Rules

The Router must classify each request as one of:

```text
report
inspect
research
plan
execute
review
modify
```

Rules:

```axl
ARTR001: router |
  receive_request(T)
  -> M classify_request(T,report|inspect|research|plan|execute|review|modify)

ARTR002: router |
  context_item(X) ∧ origin(X,prior_agent|summary|plan|log|backlog|tool)
  -> F treat_as_current_user_authorization(X)

ARTR003: router |
  mutating_transition(T) ∧ ¬current_user_authorized_mutation(T)
  -> F dispatch_mutating_agent(T)

ARTR004: router |
  current_request(report|inspect|research|review)
  -> F advance_into_implementation_state
```

Historical context may inform classification, but it does not grant execution authority.

---

## 7. Policy Projection and Rule Delivery

### 7.1 Always Included

Every delegated agent must receive:

```text
axl/types.axlt
rules/base.axlr
```

### 7.2 Conditionally Included

The Router must add:

```text
the delegated role policy
state-transition rules
gate rules
evidence rules
domain overlays
language/platform overlays
context rules
security rules
repository-local governing rules
task-specific policy
```

### 7.3 Rule Selection Principle

The Router should know:

```text
all rule modules
all disclosure triggers
all agent roles
all gate conditions
all module dependencies
all authority boundaries
```

The Router does not need to carry the complete text of every AXL file continuously.

It should retain a compact rule index and load exact rule content when constructing a dispatch.

### 7.4 Rule Handoff

Preferred order of implementation:

1. **Exact source-module injection**
2. **Compiled applicable-rule slice**
3. File-name-only handoff only as a temporary fallback

The delegated agent should receive actual rule contents where possible, not merely instructions to locate files.

---

## 8. Step-Planner Escalation

### 8.1 Purpose

The Router may be a cheap, relatively small model. It should delegate complex transition reasoning to a stronger step-planner model.

The Step Planner analyzes:

```text
multi-component changes
uncertain transition sequences
architecture
concurrency
security
cross-cutting dependencies
acceptance criteria
test strategy
risk
parallelization
model-tier requirements
```

The Step Planner proposes a sequence of bounded transitions.

The Router validates the proposal before dispatching execution.

### 8.2 Step-Planner Description

```text
Specialist planning agent used when the Router cannot safely derive the next bounded workflow transition from compact control context. It decomposes the objective into ordered steps, identifies dependencies, risks, affected components, tests, role assignments, model tiers, acceptance criteria, evidence requirements, and completion boundaries. It returns a proposal to the Router. It does not dispatch, modify the workspace, authorize mutation, waive gates, or advance workflow state.
```

### 8.3 Escalation Rules

```axl
RPLAN001: router |
  multiple_components(T)
  -> M dispatch(step_planner)

RPLAN002: router |
  uncertain_transition_sequence(T)
  -> M dispatch(step_planner)

RPLAN003: router |
  architecture_or_concurrency_or_security_risk(T)
  -> M dispatch(step_planner_large)

RPLAN004: router |
  acceptance_criteria_not_derivable(T)
  -> M dispatch(step_planner)

RPLAN005: router |
  bounded_obvious_transition(T)
  -> F dispatch_step_planner

RPLAN006: router |
  planner_proposal(P)
  -> M validate_against_authority_state_rules_and_gates(P)

RPLAN007: router |
  invalid_or_overbroad_plan(P)
  -> F execute(P)
```

### 8.4 Escalation Flow

```text
Router
  -> Step Planner
  -> Router validates proposal
  -> Router selects executor
  -> Executor returns evidence
  -> Router validates transition
```

The Step Planner never dispatches execution directly.

---

## 9. Agent Catalog

### 9.1 Explorer

```text
Inspect local repository, runtime, configuration, and workspace facts for the bounded assignment supplied by the Router. Return findings, evidence, uncertainty, blockers, and discovered scope changes. Do not modify files or advance workflow state.
```

### 9.2 Scout

```text
Research external facts required by the Router's bounded assignment. Return authoritative sources, confirmed findings, conflicts, assumptions, and unresolved uncertainty. Do not modify repository state or advance workflow state.
```

### 9.3 Step Planner

```text
Produce a bounded transition plan from the supplied objective, workflow state, AXL policy, facts, constraints, and evidence. Return ordered steps, dependencies, model tiers, acceptance criteria, tests, risks, and completion boundaries. Do not dispatch, implement, or advance workflow state.
```

### 9.4 Test Author

```text
Create only the tests and fixtures authorized by the Router. Establish the required red evidence and return commands, outputs, exit status, changed files, and failure reason. Do not edit production code or declare the red gate satisfied.
```

### 9.5 Implementer

```text
Implement only the bounded change authorized by the Router after required prerequisites and red evidence have been supplied. Return changed files, test commands, exit status, passing output, assumptions, and blockers. Do not alter governing tests, expand scope, commit, integrate, or advance workflow state.
```

### 9.6 Reviewer

```text
Independently evaluate the supplied result and evidence against the Router's review policy, acceptance criteria, and AXL rules. Remain read-only. Return blocking and non-blocking findings. Do not modify the workspace or advance workflow state.
```

### 9.7 Validator

```text
Run or inspect the required deterministic validation gates. Return exact commands, exit codes, outputs, failures, and remaining work. Do not waive failures, modify unrelated code, or advance workflow state.
```

---

## 10. Model-Tier Selection

The Router selects both:

```text
agent role
model tier
```

independently.

Suggested policy:

| Work | Agent | Model Tier |
|---|---|---:|
| Status report | Router | Small |
| Simple request classification | Router | Small |
| Bounded local inspection | Explorer | Small |
| External fact lookup | Scout | Small/Medium |
| Routine single-component planning | Step Planner M | Medium |
| Multi-component planning | Step Planner L | Large |
| Architecture/concurrency/security planning | Step Planner XL | Strongest |
| Red-test creation | Test Author | Medium |
| Routine implementation | Build M | Medium |
| Cross-component implementation | Build L | Large |
| High-risk implementation | Build XL | Strongest |
| Independent review | Reviewer | Large |
| Mechanical validation | Validator | Small/Medium |

The Router should choose the cheapest model that satisfies the required capability and risk level.

---

## 11. Router Dispatch Contract

Every dispatch must include:

```text
task ID
current workflow state
requested transition
request kind
mutation authorization
selected agent
selected role
selected model tier
policy bundle
task statement
acceptance criteria
allowed actions
forbidden actions
required evidence
completion boundary
known assumptions
unresolved questions
```

Example:

```json
{
  "task_id": "DEV-070",
  "current_state": "RED_REQUIRED",
  "requested_transition": "RED_ESTABLISHED",
  "request_kind": "execute",
  "mutation_authorized": true,
  "agent": "general",
  "role": "test_author",
  "model_tier": "medium",
  "policy_files": [
    "axl/types.axlt",
    "rules/base.axlr",
    "rules/context.axlr",
    "rules/java.axlr",
    "agents/test-author.axlr"
  ],
  "task": "Create a failing test demonstrating the specified behavior.",
  "acceptance_criteria": [
    "The test fails for the expected behavioral reason.",
    "Production code remains unchanged."
  ],
  "allowed_actions": [
    "read_repository",
    "edit_tests",
    "edit_fixtures",
    "run_targeted_tests"
  ],
  "forbidden_actions": [
    "edit_production_code",
    "change_acceptance_criteria",
    "commit",
    "integrate",
    "advance_workflow_state"
  ],
  "required_evidence": [
    "changed_files",
    "test_command",
    "exit_code",
    "failure_output",
    "failure_reason"
  ],
  "completion_boundary": "Return red-gate evidence to the Router."
}
```

---

## 12. Result Contract

Delegated agents return:

```json
{
  "dispatch_id": "DEV-070-RED-01",
  "status": "PASS",
  "claimed_transition": "RED_ESTABLISHED",
  "actions": [],
  "changed_files": [],
  "commands": [],
  "exit_codes": [],
  "evidence": [],
  "assumptions": [],
  "blockers": [],
  "scope_changes": [],
  "policy_expansion_requested": []
}
```

The `claimed_transition` is advisory only.

The Router independently determines whether the transition is accepted.

---

## 13. State-Transition Rules

```axl
RSM001: all |
  workflow_state_transition(S1,S2)
  -> M authorized_by(router)

RSM002: subagent |
  complete_assigned_transition(T)
  -> M return_evidence_to_router

RSM003: subagent |
  complete_assigned_transition(T)
  -> F advance_global_workflow_state

RSM004: router |
  evidence_satisfies_transition(S1,S2)
  -> M advance_state(S1,S2)

RSM005: router |
  evidence_missing_or_invalid(S1,S2)
  -> F advance_state(S1,S2)

RSM006: router |
  illegal_transition(S1,S2)
  -> F dispatch_transition(S1,S2)

RSM007: router |
  scope_change_detected(T)
  -> M reclassify_and_issue_new_dispatch

RSM008: router |
  delegated_agent_expanded_scope_without_authority(T)
  -> F accept_result(T)
```

---

## 14. Router Policy Rules

```axl
@ROLE
router: interpret_current_request_enforce_development_state_machine_select_legal_transition_dispatch_smallest_qualified_agent_with_required_policy_validate_evidence_and_advance_state

@AUTHORITY
owns:
  request_classification|
  workflow_state|
  transition_selection|
  agent_selection|
  model_tier_selection|
  role_assignment|
  policy_projection|
  gate_validation|
  evidence_acceptance|
  integration_readiness

delegates:
  local_discovery|
  external_research|
  complex_planning|
  test_authoring|
  implementation|
  independent_review|
  validation

forbidden:
  treat_historical_context_as_current_authority|
  dispatch_mutation_without_current_user_authorization|
  waive_required_gate|
  advance_state_without_evidence|
  delegate_global_state_authority
```

---

## 15. Policy Projection Rules

```axl
ARTR020: router |
  before_dispatch(T,A)
  -> M assemble_policy_bundle(T,A)

ARTR021: router |
  assemble_policy_bundle(T,A)
  -> M include(axl/types.axlt ∧ rules/base.axlr)

ARTR022: router |
  role(A,R)
  -> M include(agent_policy(R))

ARTR023: router |
  touches_domain(T,D)
  -> M include(rules/{D}.axlr) [pre: exists_nonempty(rules/{D}.axlr)]

ARTR024: router |
  transition_requires_policy(T,P)
  -> M include(P)

ARTR025: router |
  dispatch(T,A)
  -> M provide_acceptance_authority_gates_evidence_and_completion_boundary

ARTR026: router |
  policy_not_applicable(P,T)
  -> F include(P)
```

---

## 16. Delegation Rules

```axl
ARTR030: router |
  local_facts_missing(T)
  -> M dispatch(explore)

ARTR031: router |
  external_facts_missing(T)
  -> M dispatch(scout)

ARTR032: router |
  specification_needed(T)
  -> M dispatch_qualified_planner_by_risk(T)

ARTR033: router |
  behavior_change(T) ∧ ¬red_established(T)
  -> M dispatch(general,role=test_author)

ARTR034: router |
  implementation_ready(T)
  -> M dispatch_qualified_builder_by_risk(T)

ARTR035: router |
  implementation_complete(T)
  -> M dispatch_fresh_read_only_reviewer(T)

ARTR036: router |
  delegated_result(R)
  -> M validate_result_against_dispatch_contract(R)

ARTR037: router |
  result_requests_scope_expansion(R)
  -> M reclassify_and_issue_new_dispatch

ARTR038: router |
  delegated_agent_expanded_scope_without_authority(R)
  -> F accept_result(R)
```

---

## 17. OpenCode Agent Configuration Requirements

The Router must be the primary/default agent.

All specialist agents must be subagents.

Conceptual configuration:

```jsonc
{
  "default_agent": "router",
  "agent": {
    "router": {
      "mode": "primary",
      "description": "Authoritative AXL development-state router. Classifies the current request, enforces legal workflow transitions and gates, selects the smallest sufficient agent and model tier, supplies the exact required AXL rule bundle, validates returned evidence, and alone advances global task state."
    },
    "explore": { "mode": "subagent" },
    "scout": { "mode": "subagent" },
    "step-plan-m": { "mode": "subagent" },
    "step-plan-l": { "mode": "subagent" },
    "step-plan-xl": { "mode": "subagent" },
    "test-author": { "mode": "subagent" },
    "build-m": { "mode": "subagent" },
    "build-l": { "mode": "subagent" },
    "build-xl": { "mode": "subagent" },
    "reviewer": { "mode": "subagent" },
    "validator": { "mode": "subagent" }
  }
}
```

The exact OpenCode configuration keys must be adapted to the installed schema.

The invariant is:

```text
router = primary
all specialists = subagents
```

---

## 18. Router Context Budget

The Router should keep only:

```text
AXL types
base control rules
authority rules
state-machine rules
agent catalog
model capability catalog
rule-module index
current user request
current workflow state
compact evidence ledger
current blockers
```

The Router should not retain:

```text
full repository contents
large code diffs
full external research
large test logs
full implementation transcripts
all domain rule bodies
all agent prompt bodies
```

Large outputs should be summarized into structured evidence records.

---

## 19. Mechanical Validation

The harness should reject dispatches that violate any of these invariants:

```text
unknown agent
unknown role
unknown rule file
missing types
missing base
mutation without authorization
illegal state transition
implementation without approved specification
behavioral implementation without red evidence
reviewer with write authority
test author with production-write authority
implementer allowed to alter red tests
missing acceptance criteria
missing evidence contract
subagent granted global state authority
integration with failed gate
completion without validation
```

The Router may be model-driven, but these invariants should be mechanically enforced where possible.

---

## 20. Repository Changes

Recommended changes to `dynovo-agent-rules`:

1. Add `agents/router.axlr`.
2. Make `router` the primary OpenCode agent.
3. Mark `agents/orchestrator.axlr` as superseded or migrate its logic.
4. Move reusable orchestration logic into:
   - `rules/development-state.axlr`
   - `rules/routing.axlr`
   - `rules/gates.axlr`
   - `rules/dispatch.axlr`
   - `rules/evidence.axlr`
5. Add step-planner agent definitions:
   - `agents/step-plan-m.axlr`
   - `agents/step-plan-l.axlr`
   - `agents/step-plan-xl.axlr`
6. Add explicit state-ownership rules.
7. Add explicit current-user-authority rules.
8. Add the structured dispatch contract.
9. Add the structured result/evidence contract.
10. Add “must not advance global workflow state” to every subagent role.
11. Require every dispatch to include `types`, `base`, role policy, and matching overlays.
12. Add harness validation for dispatch invariants.

---

## 21. Acceptance Criteria

The implementation is complete when:

1. `router` is the OpenCode primary agent.
2. The Router can classify report, inspect, plan, execute, review, and modify requests.
3. Historical context cannot authorize mutation.
4. The Router maintains explicit workflow state.
5. Only the Router can advance global state.
6. The Router can select agent role and model tier independently.
7. The Router delegates complex planning to stronger step-planner models.
8. The Router supplies `types`, `base`, role rules, and matching overlays to every subagent.
9. Every dispatch includes authority, acceptance, evidence, and completion boundaries.
10. Every subagent returns structured evidence.
11. The Router validates evidence before state advancement.
12. Review is performed by a separate read-only agent instance.
13. Failed gates prevent integration and completion.
14. The Router remains viable on a low-cost, small-context model.
15. The harness rejects malformed or unsafe dispatches.

---

## 22. Final Design Principle

```text
Router = cheap deterministic control plane
Step Planner = stronger reasoning plane
Specialists = bounded execution plane
Reviewer = independent verification plane
AXL = policy plane
Harness = mechanical enforcement plane
```

The Router should be the only authority that controls workflow state, while stronger models are used selectively for reasoning-heavy work.
