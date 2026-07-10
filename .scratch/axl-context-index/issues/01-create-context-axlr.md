Status: ready-for-agent

## What to build

Create `rules/context.axlr` — a conditional domain overlay for context indexing, compression, retrieval, and recoverable memory. Follow the syntax and conventions in `rules/base.axlr`.

The overlay must include AXL-R rules (R-CTX-001+) with these semantics:

- **Context initialization**: on start of a nontrivial task, load compact task state, relevant context index entries, current pins/decisions/unresolved/evidence — do not load raw history by default.
- **Working-set discipline**: after each meaningful step, update pinned state, update context index if state changed, remove nonessential context from the active working set.
- **Recall before precision-sensitive work**: when relevant information is compressed, summarized, stale, or absent, retrieve the referenced source before making exact factual claims, editing config, changing API contracts, modifying artifacts based on prior decisions, interpreting previous errors, or overriding existing decisions.
- **Non-destructive compression**: when compressing source, create a concise summary, preserve a stable raw/source reference, preserve critical constraints/decisions/evidence/symbols/artifact paths/unresolved questions/provenance, and never replace the only recoverable copy of source material.
- **Stale-state handling**: when relying on a summary that is stale or whose underlying artifact changed, refresh or retrieve the source before use.
- **Index-entry size discipline**: a context index entry should contain only id, kind, short summary, priority, freshness/version, dependencies (when useful), and reference to durable or raw source. Do not duplicate full payloads.
- **Retrieval failure**: when required retrieval fails, report missing evidence or unavailable source; do not silently reconstruct exact content from model memory; do not present inferred content as retrieved fact.
- **Conflicting records**: when two records conflict, prefer explicit supersession metadata, otherwise prefer fresher directly sourced evidence, preserve the conflict in durable state, do not silently overwrite history.

Keep the overlay within the repository's domain-overlay load budget (<= 200 lines).

## Acceptance criteria

- [ ] `rules/context.axlr` exists and follows `rules/base.axlr` syntax conventions
- [ ] Rules cover all eight semantic areas above
- [ ] Rule identifiers use `R-CTX-NNN` format and are unique
- [ ] Overlay is within the 200-line domain-overlay budget
- [ ] File is reachable through documented load routing in `AGENTS.md`

## Blocked by

None — can start immediately.
