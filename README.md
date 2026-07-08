# dynovo-agent-rules

> **Status: experiment.** An agentic DSL built on formal-logic constructs to compress agent instructions into compact, machine-readable policy, with humanization and context-ledger extensions for explainability and resumability.

## What this is

An experiment in expressing agent instructions as a tiny formal language (`AXL`) instead of prose. Modal and deontic operators (`□` always, `◇` before closeout, `M` must, `F` must-not, `S` should, `P` may, `→` implies, `≻` priority) let rules be parsed, prioritized, and resolved deterministically rather than re-read as English every turn.

Goal: less token noise per turn, unambiguous conflict resolution, and rules that survive being moved between agents/sessions.

## Contents

- `AGENTS.md` — root router. Small default-load entrypoint that tells agents what to read and when.
- `rules/base.axlr` — compact operational core. Default rules for planning, context control, evidence, patch discipline, verification, and closeout.
- `rules/*.axlr` — optional domain overlays (`git`, `aws`, `java-spring`, `node-react`, `postgres`, `security`, `verification`). Most are placeholders to be filled in.
- `axl/spec.axlr` — full AXL-R language spec: notation, rule shape, priority model, domain objects.
- `axl/types.axlt` — shared symbols, value sigils, and status enums.
- `axl/state-spec.axls` — durable state/ledger file specification (AXL-S).
- `axl/patch-spec.axlp` — sparse patch/update file specification (AXL-P). Placeholder.
- `ledgers/example-task.axls` — task-level state ledger example.
- `ledgers/example-project.axls` — project-level state ledger example.
- `skills/axl-humanize/SKILL.md` — on-demand, fact-preserving expansion and fidelity-assessment workflow.
- `bin/install-opencode-rules` — idempotently wires the root anchor URL into `~/.config/opencode/opencode.json[c]`.

## Install

```bash
./bin/install-opencode-rules        # add the AGENTS.md anchor URL to opencode config
./bin/install-opencode-rules --force # re-install even if already present
```

Requires `jq` and `curl`.

## Credit

The DOX boilerplate form was inspired by the [DOX project](https://github.com/agent0ai/dox). Go read it.

Some state-ledger mechanics and value sigils are inspired by [Igazine/axl](https://github.com/Igazine/axl) (Agent eXchange Language).

## License

MIT — see [LICENSE](LICENSE).
