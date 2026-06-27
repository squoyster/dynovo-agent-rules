# dynovo-agents-md

> **Status: experiment.** An agentic DSL built on formal-logic constructs to compress agent instructions into compact, machine-readable policy, with humanization and context-ledger extensions for explainability and resumability.

## What this is

An experiment in expressing agent instructions as a tiny formal language (`AXL`) instead of prose. Modal and deontic operators (`□` always, `◇` before closeout, `M` must, `F` must-not, `S` should, `P` may, `→` implies, `≻` priority) let rules be parsed, prioritized, and resolved deterministically rather than re-read as English every turn.

Goal: less token noise per turn, unambiguous conflict resolution, and rules that survive being moved between agents/sessions.

## Contents

- `AGENTS.md` — root router. Small default-load entrypoint that tells agents what to read and when.
- `rules/base.md` — compact operational core. Default rules for planning, context control, evidence, patch discipline, verification, and closeout.
- `skills/axl-humanize/SKILL.md` — on-demand, fact-preserving expansion and fidelity-assessment workflow.
- `axl_agentic_coding_dsl_complete.md` — the canonical full AXL reference/spec, including rationale, schemas, examples, extension patterns, humanization rules, and PSTL context-ledger guidance.
- `axl_agentic_coding_dsl.md` — non-canonical mirror/convenience alias of the full spec. Prefer editing `axl_agentic_coding_dsl_complete.md`.
- `rules/*.md` — optional domain overlays (`git`, `aws`, `java-spring`, `node-react`, `postgres`, `security`, `verification`). Most are placeholders to be filled in.
- `bin/install-opencode-rules` — idempotently wires the root anchor URL into `~/.config/opencode/opencode.json[c]`.

## Install

```bash
./bin/install-opencode-rules        # add the AGENTS.md anchor URL to opencode config
./bin/install-opencode-rules --force # re-install even if already present
```

Requires `jq` and `curl`.

## Credit

The DOX boilerplate form was inspired by the [DOX project](https://github.com/agent0ai/dox). Go read it.

## License

MIT — see [LICENSE](LICENSE).
