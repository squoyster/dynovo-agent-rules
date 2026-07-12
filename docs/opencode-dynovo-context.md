# Dynovo OpenCode context integration

This optional package keeps durable AXL-S state and active AXL-R policy useful
when OpenCode performs native whole-session compaction. DCP remains responsible
for selective transient pruning; Dynovo never treats DCP placeholders as
canonical evidence.

## Flow

normal activity → DCP prunes stale transient context → OpenCode invokes native
compaction → Dynovo checkpoints AXL-S → projects active rules and roles → injects
the protected capsule and continuation prompt → OpenCode writes its summary →
`session.compacted` marks the checkpoint → recovery reloads canonical files →
the cheap coordinator delegates the next bounded task.

AXL-R is immutable policy authority. AXL-S is append-only mutable task state.
The generated summary is advisory. Repository files, Git state, tests, AXL-R,
and AXL-S override it.

## Install and configure

Run `./bin/install-opencode-rules --with-context-plugin --activate-router` for
the tactical router harness, or `--rules-only` for definitions without changing
the configured plugin. Use `--dry-run` to preview changes.

After installation, run `dynovo-agent-rules/bin/test-opencode-router-integration`
from a workspace containing `AGENTS.md`. It performs one read-only native
router dispatch and fails unless OpenCode reports the task call and Dynovo
persists matching router identity, dispatch, passing evidence, and an accepted
`INTAKE -> DISCOVERY` transition. `OPENCODE_BIN` may name a non-default
OpenCode executable.

`OPENCODE_CONFIG` is authoritative when set. Otherwise the installer selects
`opencode.jsonc` or `opencode.json` under XDG config. A managed
`dynovo-agent-rules/` directory beside that config receives copied, refreshable
AXL, rule, agent, skill, spec, and plugin artifacts. Copying is deliberate: the
runtime remains available when the source checkout or mounted volume is absent.
OpenCode instructions, agent prompts, and plugin entries are migrated from
source/remote paths to this deployed root. A legacy standalone `axl-boot.mjs`
entry is removed because boot continuity is integrated into the main plugin.

The resulting plugin configuration uses the deployed local entrypoint:

```jsonc
{
  "plugin": ["@tarquinen/opencode-dcp", "/path/to/dynovo-agent-rules/plugin/index.js"]
}
```

Keep native compaction enabled. If DCP performs selective pruning, disable
OpenCode's separate built-in prune only when the installed OpenCode version
supports that setting. Verify version-specific compaction keys before copying a
configuration snippet. DCP and Dynovo ordering is not semantically guaranteed.

## Recovery and privacy

After compaction, the resumed agent reloads `AGENTS.md`, base rules, overlays,
and the active ledger, then verifies role, gate, constraints, and next action.
Recovery is delivered once through the next message hook. Capsules redact bearer
tokens, API keys, private keys, credential URLs, authorization headers, and
secret-like environment assignments as `<REDACTED:DYNOVO_SECRET>`.

Runtime state is local under `.dynovo/` and ignored by default. The hook makes no
network calls or LLM calls. Experimental OpenCode hook names are isolated in one
adapter and may require maintenance as OpenCode evolves. The tested OpenCode
plugin input does not expose the resolved plugin list, so DCP presence is a
best-effort diagnostic only; coexistence never depends on detecting it.

## Configuration and workers

Defaults enable checkpointing, custom prompts, recovery, DCP coexistence, and a
cheap `coordinator` role. The schema accepts capsule limits, orchestrator
controls (`requireEvidenceFromWorkers` is true and child transcripts are never
retained), and explicit missing-ledger/ruleset/agent/write failure policies.

Planner assignments return dependencies, gates, and acceptance mapping without
implementation. Explorers are read-only. Test authors change tests and fixtures
only. Implementers change only assigned production scope and never approved red
tests. Reviewers are read-only and independent. Persist bounded assignments,
material evidence, and unresolved items—not transcripts.

## Troubleshooting and migration

If compaction recovery is missing, verify the local plugin `dist/index.js` path,
restart OpenCode, and inspect `.dynovo/checkpoints/<session>/`. If a ledger is
invalid, Dynovo emits an explicit warning and references the canonical path; it
never invents state. To migrate from native-only compaction, install the plugin,
create an AXL-S ledger for nontrivial work, then enable DCP separately if wanted.

Experimental OpenCode hooks can change between releases. Keep the plugin pinned
to the tested OpenCode API version and treat unavailable post-compaction events
as a recovery-warning condition rather than proof of a successful checkpoint.
