---
name: axl-humanize
description: Translate or summarize compressed AXL, policy blocks, technical notes, and source-derived summaries into readable prose while preserving important facts and rule semantics. Use when asked to explain, expand, decode, humanize, or assess the fidelity of AXL or compressed markdown.
---

# AXL Humanize

Make compact material readable without silently discarding its information-bearing content.

## Distinguish the operation

- For AXL translation, preserve exact rule semantics.
- For source-summary humanization, improve readability; do not treat “humanize” as permission to summarize again.
- If the user requests a shorter result, compress only after building the fact kernel below.

## Workflow

1. Identify each available layer: original source, encoded/compressed form, and prior humanized form. Do not imply that an unavailable layer was checked.
2. Build an internal fact kernel (`FK`) from the input:
   - thesis and purpose;
   - named entities/components and their roles;
   - mechanisms and causal relationships;
   - invariants, constraints, and correctness conditions;
   - defaults, alternatives, and variant status;
   - methods, calibration, or evaluation design;
   - quantitative claims with units, baselines, conditions, and direction;
   - limitations, uncertainty, assumptions, and provenance.
3. Mark facts central to the document's purpose as required. Keep exact values, qualifiers, negation, and causal direction required whenever present.
4. Rewrite for the requested audience and detail level. Reorganize and simplify syntax, but do not invent bridging claims.
5. Audit the output against every required fact. Restore omissions or explicitly list omitted fact classes when brevity prevents full coverage.

## AXL contract

Preserve rule IDs, modal force (`M/F/S/P/Pref`), scope, trigger, action, ordering, priority, exceptions, verification, effects, and unresolved conflicts. Never weaken or strengthen a norm. Mark malformed or ambiguous input instead of guessing.

## Source-summary contract

- Keep source claims separate from inference or implementation advice.
- Preserve whether a component is the default, an option, or an evaluated variant.
- Preserve numbers only with their metric and comparison context; otherwise omit the number and disclose the omission.
- Preserve named techniques that materially explain correctness or reported performance.
- Keep a source reference when the compressed artifact relies on recoverability rather than carrying all detail inline.

## Fidelity comparison

When comparing transformations, evaluate separately:

- core claims and architecture;
- mechanisms and correctness constraints;
- defaults and variants;
- quantitative claims and conditions;
- methods, evaluation, and deployment details;
- unsupported additions or changed certainty.

Report observed omissions and distortions before assigning any score. Label token counts as exact only when produced by a named tokenizer; otherwise call them estimates.

## Output

Default to natural prose. Use a table only for rule-by-rule translation or a fidelity matrix. Preserve readability, then append a compact “Important retained details” section only when those facts do not fit naturally in the narrative.
