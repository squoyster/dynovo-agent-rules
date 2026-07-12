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
- `agents/router.axlr` — tactical primary control plane extracted from the agentic router specification.
- `agents/orchestrator.axlr` — legacy backlog coordinator superseded by the router.
- `ledgers/example-task.axls` — task-level state ledger example.
- `ledgers/example-project.axls` — project-level state ledger example.
- `skills/axl-humanize/SKILL.md` — on-demand, fact-preserving expansion and fidelity-assessment workflow.
- `bin/install-opencode-rules` — deploys a self-contained AXL runtime bundle and wires OpenCode to stable local paths.
- `agents/context-orchestrator.axlr` — cheap coordinator role with bounded delegation and evidence rules.
- `packages/opencode-dynovo-context/` — optional OpenCode native-compaction integration; see its README.
- `bin/validate-axl` — checks AXL-R grammar, IDs, imports, and prompt budgets.

## Install

```bash
./bin/install-opencode-rules --rules-only
./bin/install-opencode-rules --with-context-plugin
./bin/install-opencode-rules --with-context-plugin --activate-router
./bin/install-opencode-rules --force --with-context-plugin --activate-router
```

The installer honors `OPENCODE_CONFIG` first; otherwise it resolves
`opencode.jsonc` or `opencode.json` under XDG config. It refreshes a managed
`dynovo-agent-rules/` copy beside the selected config, including AXL, rules,
agents, skills, source specs, and the built plugin. OpenCode never depends on
this checkout or its mount path after deployment. `--activate-router` reuses
the existing orchestrator model and permissions while making the deployed
router prompt primary. Requires `jq`, Node.js, and the macOS-compatible system
`awk`; the installer intentionally avoids GNU-only awk features.

Validate policy changes with:

```bash
./bin/validate-axl
```

## Credit

The DOX boilerplate form was inspired by the [DOX project](https://github.com/agent0ai/dox). Go read it.

Some state-ledger mechanics and value sigils are inspired by [Igazine/axl](https://github.com/Igazine/axl) (Agent eXchange Language).

## License

MIT — see [LICENSE](LICENSE).
