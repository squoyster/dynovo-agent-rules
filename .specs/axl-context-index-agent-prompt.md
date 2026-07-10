# Agentic Prompt: Implement AXL-Native Context Indexing and Recoverable Memory

Implement an AXL-native context indexing and recoverable-memory design in this repository.

## Objective

Improve agent reliability on small models and long-running tasks by implementing:

1. A compact, addressable context index.
2. Stable references to context sections.
3. A small active working set rather than accumulated transcript context.
4. Recoverable compressed context through MCP or equivalent retrieval tools.
5. Explicit retrieval-before-action rules for precision-sensitive operations.
6. Durable decision, evidence, constraint, artifact, and unresolved-item records.
7. Non-destructive compression: summaries must retain references to source material.

Treat AXL as the control/state representation. Do not use it as a raw transcript dump.

## Initial repository inspection

Before editing:

1. Read:
   - `AGENTS.md`
   - `rules/base.axlr`
   - `axl/types.axlt`
   - `axl/state-spec.axls`
   - `axl/patch-spec.axlp`
   - relevant files under `ledgers/`
   - any existing MCP/tool specifications or implementations
2. Inspect the repository tree for existing naming conventions.
3. Search for:
   - `@PIN`
   - `@CTX`
   - `@DONE_CTX`
   - `@REF`
   - `@EVIDENCE`
   - `@DECISIONS`
   - `PinSet`
   - `summarize`
   - `retrieve`
   - `recall`
   - `MCP`
4. Reuse existing syntax and concepts where possible.
5. Do not create duplicate abstractions when an existing AXL block can express the requirement.
6. Do not modify AXL semantics casually. Any semantic extension must be reflected in the canonical specification and examples.

## Architectural model

Implement or document this four-level memory model:

```text
L0: active task context
    Goal, current step, immediate constraints, relevant artifacts,
    current evidence, and next action.

L1: compact context index and pinned state
    Stable IDs, short summaries, priority, freshness, dependencies,
    and references to recoverable records.

L2: durable summarized records
    Decisions, evidence, constraints, artifact summaries, plans,
    unresolved items, and source references.

L3: raw recoverable sources
    Original transcript chunks, command output, files, logs, or other
    source material available through an MCP/tool retrieval boundary.
```

Default model-visible context should normally contain L0 and the relevant subset of L1. L2 and L3 should be retrieved only when required.

## Required changes

### 1. Add `rules/context.axlr`

Create:

```text
rules/context.axlr
```

This file is a conditional domain overlay for context indexing, compression, retrieval, and recoverable memory.

Follow the syntax and conventions already used in `rules/base.axlr`.

Include rules with the following semantics. Adjust exact notation to remain valid under the current AXL specification.

#### Context initialization

```text
start(nontrivial_task)
  -> load compact task state
  -> load relevant context index entries
  -> load current pins, decisions, unresolved items, and evidence
  -> do not load raw history by default
```

#### Working-set discipline

```text
after each meaningful step
  -> update pinned state
  -> update context index if state changed
  -> remove nonessential context from the active working set
```

#### Recall before precision-sensitive work

```text
precision_sensitive(task)
and relevant information is compressed, summarized, stale, or absent
  -> retrieve the referenced source before:
       - making an exact factual claim
       - editing configuration
       - changing an API contract
       - modifying an artifact based on prior decisions
       - interpreting a previous error
       - overriding an existing decision
```

Precision-sensitive work includes at minimum:

- exact configuration syntax
- shell commands with side effects
- API signatures
- dependency versions
- file paths
- prior user constraints
- architectural decisions
- error text
- test expectations
- security-sensitive changes
- destructive or difficult-to-reverse actions

#### Non-destructive compression

```text
compress(source)
  -> create concise summary
  -> preserve stable raw/source reference
  -> preserve critical constraints, decisions, evidence, symbols,
     artifact paths, unresolved questions, and provenance
  -> never replace the only recoverable copy of source material
```

#### Stale-state handling

```text
rely_on(summary)
and summary is stale or underlying artifact changed
  -> refresh or retrieve source before use
```

#### Index-entry size discipline

A context index entry should contain only:

```text
id
kind
short summary
priority
freshness/version
dependencies when useful
reference to durable or raw source
```

Do not duplicate full payloads inside the index.

#### Retrieval failure

```text
required retrieval fails
  -> report missing evidence or unavailable source
  -> do not silently reconstruct exact content from model memory
  -> do not present inferred content as retrieved fact
```

#### Conflicting records

```text
two records conflict
  -> prefer explicit supersession metadata
  -> otherwise prefer fresher directly sourced evidence
  -> preserve the conflict in durable state
  -> do not silently overwrite history
```

Use clear rule identifiers such as:

```text
R-CTX-001
R-CTX-002
...
```

Keep the overlay within the repository's domain-overlay load budget.

### 2. Update `AGENTS.md`

Modify:

```text
AGENTS.md
```

Add `rules/context.axlr` to conditional load routing.

Add a disclosure/load rule equivalent to:

```text
touches(T, context_management | memory | retrieval | compression |
           handoff | long_running_agent_state)
  -> load(rules/context.axlr)
```

Requirements:

- Preserve the small default-load policy.
- Do not make `rules/context.axlr` universally loaded unless the existing architecture clearly requires it.
- Keep the router within its documented line budget.
- Add the new file to the canonical-files section if appropriate.

### 3. Extend `axl/state-spec.axls`

Modify:

```text
axl/state-spec.axls
```

Prefer extending existing blocks before adding new block types.

Use existing blocks as follows where possible:

- `@PIN`: active constraints and high-value working-state facts
- `@CTX`: immutable source directives or context source declarations
- `@DONE_CTX`: records of completed context retrieval/execution
- `@EVIDENCE`: observations and provenance
- `@DECISIONS`: active, superseded, or rejected decisions
- `@REF`: durable or raw source references
- `@STATE`: compact current state
- `@PLAN`: append-only task state
- `@LOG` / `@LOGREF`: append-only history and rotated raw material

Only add new blocks such as `@CTX_INDEX`, `@CTX_REC`, or `@RECALL_HINT` if the existing blocks cannot represent the required semantics cleanly.

If new blocks are added:

1. Add them to `@BLOCKS`.
2. Define update/mutability rules.
3. Define required fields.
4. Define preservation behavior.
5. Define how they reference raw source material.
6. Update version and modified date according to repo conventions.
7. Preserve unknown-block behavior.

A compact context-index record should support:

```text
id
kind
summary
priority
freshness or version
dependencies
ref
status
supersedes
```

Do not require every optional field on every record.

### 4. Add an example ledger

Create:

```text
ledgers/context-index.example.axls
```

Use valid AXL-S syntax from the current repository.

The example should demonstrate:

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

The example should represent a realistic agentic coding task.

Conceptually, include records equivalent to:

```text
G1 goal
C1 critical constraint
D1 active architectural decision
E1 observed command failure
A1 artifact path and summary
U1 unresolved question
R1 raw source reference
```

Keep index entries short. Full payloads must live in durable records or referenced sources.

### 5. Add an MCP/tool contract

First inspect whether the repository already has a canonical place for tool or MCP contracts.

Prefer the existing convention. If no convention exists, create:

```text
axl/mcp-spec.axlm
```

If `.axlm` is not an accepted repository file type, use the closest existing canonical location and document the choice.

Define or document these logical operations:

```text
ctx.index(task)
  -> compact relevant index

ctx.retrieve(ref | prefix | query)
  -> raw or expanded source chunk

ctx.pin(record)
  -> add or update active pinned state

ctx.summarize(raw_ref)
  -> concise summary plus preserved source reference

ctx.trace(claim_or_decision)
  -> evidence and provenance chain

ctx.refresh(ref)
  -> updated summary after source change
```

For each operation, specify:

- input shape
- output shape
- failure behavior
- provenance requirements
- maximum/default result size
- whether results are exact source text, summaries, or both
- how stale results are identified
- how stable references are returned

Do not require a concrete MCP server implementation unless one already exists in the repo. A contract/specification is sufficient if runtime code is out of scope.

### 6. Update AXL types only if necessary

Modify:

```text
axl/types.axlt
```

only if new shared enums or symbols are genuinely required.

Possible values may include:

```text
priority: critical | high | medium | low
freshness: fresh | stale | unknown
record_status: active | superseded | resolved | blocked
context_kind: goal | constraint | decision | evidence | artifact |
              unresolved | plan | log | raw_source
```

Do not add redundant symbols already represented in the file.

Keep the types file within its documented load budget.

### 7. Update canonical AXL semantics only if necessary

Modify:

```text
axl/spec.axlr
```

only if the implementation introduces actual AXL-R language semantics rather than repository-level rules or state conventions.

Do not load or modify the full language specification merely to document a domain overlay.

If no language-semantic change is needed, leave `axl/spec.axlr` unchanged and state that explicitly in the final report.

### 8. Add human-readable documentation

Add a concise section to the most appropriate existing documentation file. If no suitable file exists, create:

```text
docs/context-memory.md
```

Document:

- the L0-L3 model
- why raw transcript accumulation is discouraged
- how stable references work
- how summaries preserve provenance
- when agents must retrieve source material
- how context overlays are conditionally loaded
- the difference between AXL-R policy and AXL-S state
- one end-to-end example

Avoid duplicating the canonical rules verbatim.

## Suggested compact representation

Use a compact representation similar to this only if valid under the current syntax:

```text
@STATE
goal: G1
step: T3
next: inspect current provider configuration

@PIN
C1 pri=critical text="Do not rely on compressed memory for exact config syntax"
D1 pri=high ref=ctx/decisions#12
U1 pri=high ref=ctx/unresolved#3

@CTX_INDEX
G1 kind=goal pri=high summary="Implement indexed recoverable context" ref=ctx/goal#1
C1 kind=constraint pri=critical summary="Recall before exact edits" ref=ctx/constraints#4
D1 kind=decision pri=high summary="Use L0-L3 memory model" ref=ctx/decisions#12
E1 kind=evidence pri=high summary="Prior config command failed" ref=ctx/evidence#21
A1 kind=artifact pri=medium summary="Provider configuration" ref=file://config/provider.yaml
U1 kind=unresolved pri=high summary="Choose retrieval ranking policy" ref=ctx/unresolved#3

@DECISIONS
D1 status=active supersedes=D0
text="Use working set + compact index + recoverable archive"
because="Small models exhibit attention dilution and position bias"

@EVIDENCE
E1 source=raw://runs/20260709/provider-error.log
summary="Command returned zero matching files"
freshness=fresh

@DONE_CTX
id=RC1
request="exact provider syntax"
source=raw://runs/20260709/provider-config.yaml
result_ref=ctx/retrieved#31
at=@20260709T170000
```

Adapt this to the actual syntax. Do not force invalid constructs into the repository.

## Acceptance criteria

The work is complete only when all applicable criteria pass:

1. `rules/context.axlr` exists and is conditionally routed from `AGENTS.md`.
2. Context behavior is represented as AXL-R rules, not mixed into live state.
3. Durable context records use AXL-S.
4. Index entries use stable IDs and source references.
5. Compression is non-destructive.
6. Exact or precision-sensitive work requires retrieval when source data is compressed, stale, or absent.
7. Retrieval failures are explicit.
8. Stale summaries are not silently treated as current.
9. Conflicting records preserve history and support supersession.
10. A realistic example ledger exists.
11. MCP/tool retrieval operations are specified in the repo’s canonical location.
12. Existing rules and state blocks are reused where possible.
13. No canonical rule is duplicated across multiple files.
14. Default-load context remains small.
15. All modified AXL files conform to current syntax.
16. File and line budgets in `AGENTS.md` are respected.
17. Relevant validation, linting, parsing, or tests pass.
18. Documentation explains the architecture without becoming another large default-loaded context source.

## Validation

Run all available relevant checks, including:

- repository tests
- AXL parser or validation commands
- linting
- formatting
- searches for broken references
- checks for line-budget violations
- checks that new files are reachable through documented load routing

If no automated validator exists:

1. Manually compare syntax against canonical examples.
2. Verify every new reference points to an existing or intentionally external target.
3. Verify all new block types, if any, are declared in `axl/state-spec.axls`.
4. Verify every rule identifier is unique.
5. Verify no full payload is duplicated into the compact index.

## Constraints

- Make the smallest coherent change set.
- Preserve backward compatibility.
- Do not rename existing blocks or symbols without a compelling reason.
- Do not delete existing examples.
- Preserve append-only and immutable-state rules.
- Do not store secrets.
- Do not invent retrieved source contents.
- Do not add runtime dependencies unless required.
- Do not implement a vector database or retrieval backend unless one already exists and integration is clearly in scope.
- Do not create strict XML merely for model readability.
- Prefer compact AXL-native records and stable references.
- Keep raw source material outside the default active context.
- Preserve exact raw material through references rather than copying it everywhere.

## Final response

At completion, report:

1. Files created.
2. Files modified.
3. Important design decisions.
4. Whether new AXL semantics were introduced.
5. Whether `axl/spec.axlr` changed and why.
6. Validation commands run and their results.
7. Any unresolved implementation questions.
8. A concise example showing:
   - initial compact context
   - a precision-sensitive task
   - retrieval of a referenced source
   - action after retrieval
   - durable state update
