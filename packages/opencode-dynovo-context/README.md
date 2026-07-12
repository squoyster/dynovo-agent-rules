# @dynovo/opencode-context

Optional OpenCode integration for durable Dynovo AXL-R policy and AXL-S task
state during native whole-session compaction.

Dynovo does not replace DCP. DCP owns selective transient pruning and duplicate
tool-output reduction; this plugin owns durable state, active roles, delegation,
constraints, evidence, checkpointing, and the native compaction prompt. Install
both as ordinary plugins; no ordering guarantee is required.

```jsonc
{
  "plugin": ["@tarquinen/opencode-dcp", "@dynovo/opencode-context"]
}
```

The hook checkpoints AXL-S, projects active AXL-R obligations, renders one
`DYNOVO_PROTECTED_CONTEXT_V1` capsule, and supplies a replacement continuation
prompt through `experimental.session.compacting`. A successful
`session.compacted` event marks the checkpoint and schedules one recovery
instruction. Canonical AXL-R, AXL-S, repository, Git, and executable evidence
always override the generated summary.

The plugin also injects an AXL continuity instruction through
`experimental.chat.system.transform`. Each session receives a random canary.
The companion message transform checks retained assistant text for that exact
completion reference: when present, the next request receives a compact
continuation instruction; when absent after compaction, reconstruction, or
context loss, the next request receives the full AXL disclosure bootstrap.
Session deletion and plugin disposal release the in-memory continuity state.

Setting `enabled` to `false` disables both context checkpointing and AXL boot
hooks. The package test suite builds and imports `dist/index.js` so continuity
behavior is verified through the artifact that OpenCode and the installer load.

Local runtime state lives under `.dynovo/` and is ignored by default. Teams may
commit deliberately selected task ledgers. No network or LLM call occurs during
compaction; experimental OpenCode hook names are isolated in the adapter.
