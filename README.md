# dynovo-agent-rules

> **Status: experiment.** An agentic DSL built on formal-logic constructs to compress agent instructions into compact, machine-readable policy, with humanization and context-ledger extensions for explainability and resumability.

## What this is

An experiment in expressing agent instructions as a tiny formal language (`AXL`) instead of prose. A deliberately small norm and operator set lets rules be scanned, prioritized, and resolved deterministically rather than re-read as English every turn.

Goal: less default prompt noise, deterministic rule evaluation, and policies that remain usable by small models and across sessions.

## Weak-model profile

Active AXL-R uses one physical line per rule, an explicit `scope | trigger`, one
modal norm, and a fixed qualifier vocabulary. The root router has no recursive
control flow. A model can follow the policy with a shallow loop: load the routed
files, scan every rule, apply every match, resolve conflicts, then verify before
reporting success. `bin/validate-axl` mechanically checks that profile.

## Contents

- `AGENTS.md` — root router. Small default-load entrypoint that tells agents what to read and when.
- `rules/base.axlr` — compact operational core. Default rules for planning, context control, evidence, patch discipline, verification, and closeout.
- `rules/gitnexus.axlr` — conditional code-intelligence policy, kept out of the default prompt.
- `rules/*.axlr` — optional domain overlays (`git`, `aws`, `java-spring`, `node-react`, `postgres`, `security`, `verification`). Most are placeholders to be filled in.
- `axl/spec.axlr` — AXL-R grammar, modal semantics, evaluation order, and authoring rules.
- `axl/types.axlt` — shared symbols, value sigils, and status enums.
- `axl/state-spec.axls` — durable state/ledger file specification (AXL-S).
- `axl/patch-spec.axlp` — sparse, recoverable state-update specification (AXL-P).
- `agents/orchestrator.axlr` — deterministic backlog selection and subagent routing.
- `ledgers/example-task.axls` — task-level state ledger example.
- `ledgers/example-project.axls` — project-level state ledger example.
- `skills/axl-humanize/SKILL.md` — on-demand, fact-preserving expansion and fidelity-assessment workflow.
- `bin/install-opencode-rules` — idempotently wires the root anchor URL into `~/.config/opencode/opencode.json[c]`.
- `agents/context-orchestrator.axlr` — cheap coordinator role with bounded delegation and evidence rules.
- `packages/opencode-dynovo-context/` — optional OpenCode native-compaction integration; see its README.
- `bin/validate-axl` — checks AXL-R grammar, IDs, imports, and prompt budgets.

## Install

```bash
./bin/install-opencode-rules --rules-only        # add only the AGENTS.md anchor URL
./bin/install-opencode-rules --with-context-plugin # add rules and Dynovo plugin
./bin/install-opencode-rules --force # re-install even if already present
```

Requires `jq` and `curl`.

Validate policy changes with:

```bash
./bin/validate-axl
```

## Credit

The DOX boilerplate form was inspired by the [DOX project](https://github.com/agent0ai/dox). Go read it.

Some state-ledger mechanics and value sigils are inspired by [Igazine/axl](https://github.com/Igazine/axl) (Agent eXchange Language).

## License

MIT — see [LICENSE](LICENSE).
