---
name: axl-encode
description: Translate non-AXL context, instructions, plans, policies, notes, transcripts, handoffs, and technical state into compact AXL-R, AXL-S, or AXL-P while preserving semantics, provenance, uncertainty, and recoverability. Use when asked to encode, compress, normalize, structure, index, or convert ordinary prose or mixed context into AXL.
---

# AXL Encode

Translate non-AXL material into the smallest valid AXL representation that preserves operational meaning.

## Load

Read before encoding:

1. `../../axl/types.axlt`
2. `../../axl/spec.axlr` for AXL-R output
3. `../../axl/state-spec.axls` for AXL-S output
4. `../../axl/patch-spec.axlp` for AXL-P output
5. Governing `AGENTS.md` and relevant `rules/*.axlr`

Do not load unrelated overlays or examples.

## Select output kind

```axl
policy|behavior|constraint|triggered_action -> AXL-R (*.axlr)
state|plan|handoff|context|evidence|decision|log|ref -> AXL-S (*.axls)
mutation|delta|update|migration -> AXL-P (*.axlp)
mixed -> split_by_kind ∧ bind_with(@REF|@IMPORT)
```

Do not encode durable state as rules or normative behavior as ledger state.

## Build fact kernel

Extract before compression:

```axl
FK := {
  purpose,
  scope,
  actors,
  entities,
  facts,
  constraints,
  invariants,
  triggers,
  actions,
  ordering,
  priority,
  exceptions,
  verification,
  effects,
  decisions,
  evidence,
  assumptions,
  uncertainty,
  unresolved,
  provenance,
  refs
}
```

Preserve:

```axl
M exact(negation|modal_force|causal_direction|ordering|priority)
M exact(numbers_with_units_and_conditions)
M distinguish(fact|claim|assumption|inference|decision|preference)
M retain(source_ref) when detail is external or compressed
F invent(missing_content)
F silently_resolve(ambiguity|conflict)
F strengthen_or_weaken(norm)
```

## Normalize

```axl
prose_must            -> M
prose_must_not        -> F
prose_should          -> S
prose_may             -> P
prose_prefer          -> Pref
before                -> ≺
higher_priority       -> ≻
and                   -> ∧
or                    -> ∨
not                   -> ¬
implies               -> →
for_each              -> ∀
exists                -> ∃
```

Use canonical symbols from `axl/types.axlt`; do not mint aliases when one exists.

## Encode AXL-R

Use canonical rule shape:

```axl
R[id]: scope | trigger -> norm action
[pre: ...]
[read: ...]
[verify: ...]
[except: ...]
[effect: ...]
[emit: ...]
```

Rules:

```axl
M stable(rule_id)
M explicit(scope ∧ trigger ∧ norm ∧ action)
M preserve(ordering ∧ priority ∧ exceptions ∧ verification)
S one_primary_obligation_per_rule
S split(compound_rule) when independent failure/reporting is useful
F bury(normative_requirement,in prose_comment)
F encode(example_as_rule)
```

## Encode AXL-S

Prefer existing blocks:

```axl
@META
@STATE
@PLAN
@PIN
@CTX
@CTX_INDEX
@DONE_CTX
@EVIDENCE
@RISKS
@DECISIONS
@LOG
@LOGREF
@REF
@IMPORT
@LOCK
```

Rules:

```axl
M @META
M stable_ids(records)
M preserve(append_only_blocks)
M preserve(unknown_blocks)
M use(@REF|@LOGREF) instead_of_duplicate_payload
M mark(status|freshness|supersedes) when applicable
F mutate(@CTX source directives)
F store(secret_inline)
F write(!NOW)
```

If a needed block is absent from `axl/state-spec.axls`, use the nearest valid existing block and report the mismatch. Do not silently extend the language.

## Encode AXL-P

```axl
M identify(target ∧ operation ∧ precondition ∧ expected_effect)
M preserve(old_ref ∧ new_ref) when recoverability matters
M make(delta) rather_than_restate(full_state)
F apply(ambiguous_target)
```

Use only constructs defined in `axl/patch-spec.axlp`.

## Context compression

For large context:

```axl
M partition(by: goal|constraint|decision|evidence|artifact|risk|unresolved)
M assign(stable_id)
M create(compact_index)
M pin(high_priority ∧ active ∧ crosscutting)
M preserve(raw_ref ∧ provenance)
F duplicate(full_payload,in_index)
F destroy(only_recoverable_source)
```

Index entry kernel:

```axl
{id,kind,summary,priority,freshness,ref,deps?,status?,supersedes?}
```

Summary requirements:

```axl
M self_contained_for_routing
M retain(discriminating_terms)
M retain(critical_qualifiers)
S <= #160 chars unless loss requires more
F claim(summary_is_source)
```

## Ambiguity and loss handling

```axl
ambiguous(x) -> M emit(@RISKS|parse_error|unresolved(x)) ∧ F guess_silently
conflict(a,b) -> M preserve(a ∧ b) ∧ M mark(conflict) ∧ P identify(precedence_if_explicit)
missing(x) -> M mark(unknown|absent) ∧ F fabricate(x)
loss_required(limit) -> M retain(critical_FK) ∧ M disclose(omitted_classes)
```

## Translation procedure

```axl
E1 classify(input_kind)
E2 load(canonical_spec_for_output_kind)
E3 build(FK)
E4 partition(FK)
E5 map_to(canonical_blocks|rules|patches)
E6 assign(stable_ids ∧ refs)
E7 compress(repetition)
E8 validate(syntax ∧ semantics ∧ provenance ∧ modal_fidelity)
E9 emit(AXL_only unless explanation_requested)
```

## Validation

```axl
V1: every_required_FK_fact -> represented ∨ referenced ∨ explicitly_omitted
V2: every_rule -> valid_id ∧ scope ∧ trigger ∧ norm ∧ action
V3: no_norm_changed
V4: no_fact_promoted_from(assumption|inference)
V5: all_refs_resolvable_or_marked_external
V6: no_payload_duplication_without_reason
V7: output_kind_matches_semantics
V8: conforms(canonical_spec)
```

On validation failure:

```axl
M report(exact_failure)
F emit_as_valid_AXL
```

## Output

Default:

```text
- AXL only
- no explanatory prose
- no XML wrapper
- preserve source order only when semantically meaningful
- use comments only for provenance or irreducible ambiguity
```

When file placement is requested:

```text
FILE: <target/path>
<complete AXL block>
BIND: <existing/path>#<section> -> <binding line/block>
```

When converting multiple semantic kinds:

```text
FILE: rules/<domain>.axlr
...

FILE: ledgers/<name>.axls
...

BIND: AGENTS.md#@DISCLOSURE
...
```
