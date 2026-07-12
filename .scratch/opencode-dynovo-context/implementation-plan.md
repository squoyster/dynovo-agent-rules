# Capability-partitioned implementation plan

The minimum partition that uses all three requested model classes is three
dependency-ordered work packets. This avoids parallel re-reading and gives the
lowest-cost model the most mechanical work.

## SOL-001 — high-uncertainty contracts and red gate

Owner: `gpt-5.6-sol`

Scope:

- inspect repository, installed OpenCode types, current upstream behavior, and
  DCP integration;
- pin architecture, invariants, public seams, and failure policy;
- create the package/test harness and literal fixtures;
- add failing contract tests for AXL-S losslessness, capsule priority/redaction,
  hook transaction ordering/idempotency, and recovery event behavior;
- define the OpenCode adapter types without implementing the production core.

Gate: targeted tests fail only because the production seams are absent.

Why Sol: API instability, transaction/digest design, and security boundaries
have the highest reasoning cost and the highest cost of a mistaken assumption.

## TERRA-001 — production core and green gate

Owner: `gpt-5.6-terra`

Depends on: `SOL-001`

Scope:

- implement configuration, registry, AXL-S parser/serializer/validator/projector,
  roles, delegation records, rule projection/cache, capsule/prompt/checkpoint,
  and the isolated OpenCode adapter;
- implement atomic persistence, per-session serialization, idempotency,
  graceful degradation, and one-shot recovery;
- make the Sol contract suite green without weakening tests;
- add narrowly necessary production-focused test cases discovered while coding.

Gate: typecheck, targeted tests, and package build pass.

Why Terra: this is the largest coherent implementation slice and benefits from
strong coding capability without paying the highest reasoning rate for routine
module construction.

## LUNA-001 — mechanical integration, breadth, and closeout

Owner: `gpt-5.6-luna`

Depends on: `TERRA-001`

Scope:

- extend AXL-S with backward-compatible delegation/checkpoint blocks;
- add `agents/context-orchestrator.axlr` and the worker template;
- implement optional installer flags and JSON/JSONC fixtures;
- add README/package documentation, DCP guidance, schema, examples, snapshots,
  and the end-to-end fixture;
- run formatting, lint, typecheck, tests, build, `bin/validate-axl`, diff checks,
  and assemble evidence for independent review.

Gate: every acceptance criterion has evidence and the diff is ready for a fresh
read-only specification and standards review.

Why Luna: documentation, fixtures, installer matrices, schema examples, and
verification bookkeeping are broad but comparatively deterministic.

## Promotion review

The repository requires a fresh independent reviewer before promotion. This is
not a fourth implementation packet: after `LUNA-001`, use a new read-only model
instance to perform the two-axis standards/specification review and route any
blocking finding back to its owning packet.
