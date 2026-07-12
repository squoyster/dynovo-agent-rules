# OpenCode Dynovo Context Plugin: pre-implementation findings

Recorded: 2026-07-11

## Repository baseline

- Baseline commit: `055ea82953bd2a678f5682eb7365e5b854d7471b`.
- Baseline worktree: clean.
- Baseline validation: `bin/validate-axl` passes with 14 rule files, 185 rules,
  6 budgets, and 7 empty placeholder overlays skipped.
- The repository is not currently a Node workspace and has no JavaScript test
  runner or package convention.
- The existing OpenCode installer only adds the remote root `AGENTS.md` URL. It
  supports `--force`; it does not support dry-run, rules-only, plugin, or DCP
  options.
- Canonical router references in `AGENTS.md` resolve to their `.axlr`, `.axls`,
  `.axlt`, and `.axlp` files. No relevant nonexistent `.md` router target was
  found.
- Existing context surfaces are `rules/context.axlr`,
  `agents/compaction.axlr`, and AXL-S examples under `ledgers/`. None implements
  an OpenCode plugin or durable compaction checkpoint transaction.
- `axl/state-spec.axls` v0.6 preserves unknown blocks but does not formally list
  `@DELEGATIONS` or checkpoint records.

## OpenCode API verification

Installed OpenCode and packages inspected locally:

- OpenCode CLI: `1.17.18`
- `@opencode-ai/plugin`: `1.17.18`
- `@opencode-ai/sdk`: `1.17.18`
- type source:
  `~/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts`

Verified hook contracts:

- `experimental.session.compacting(input: { sessionID }, output: { context:
  string[]; prompt?: string })`: runs before compaction; `context` augments the
  request and `prompt` replaces the default compaction prompt.
- `event({ event })`: receives the typed `session.compacted` event with
  `properties.sessionID` after successful compaction.
- `chat.message`: can observe new messages and their selected agent.
- `experimental.chat.messages.transform`: can transform the outgoing message
  list, but Dynovo must not use it for pruning because that would conflict with
  DCP ownership.
- `experimental.compaction.autocontinue`: runs after compaction succeeds and
  before OpenCode's synthetic continuation turn. The first implementation
  should use the stable event path for checkpoint success and use a single
  guarded recovery injection path rather than disabling auto-continue.

The experimental hook boundary must live in one adapter module because these
names and payloads may change.

## DCP verification

- Current package name verified: `@tarquinen/opencode-dcp`.
- Current public package version observed during research: `3.1.14`.
- DCP transforms transient model context, exposes compression tooling, replaces
  pruned content with placeholders, deduplicates repeated tool calls, and
  purges stale errored-tool inputs.
- Dynovo must not interpret DCP placeholders or DCP summaries as evidence and
  must not register a competing message-pruning transform.
- Plugin order is a recommended readable arrangement only; no semantic ordering
  guarantee was found for this integration.

## Configuration verification

- OpenCode plugin configuration accepts either a package string or
  `[package, options]` according to the installed `Config` type.
- The requested native compaction example keys need validation against the
  installed OpenCode config schema before documentation. Do not document
  `tail_turns` or `preserve_recent_tokens` as supported until verified.
- Plugin-specific configuration should support tuple options and an optional
  repository-local JSON/JSONC file without requiring network access.

## Public seams agreed by the specification

The user specification explicitly defines the seams, so no additional test-seam
clarification is required:

1. AXL-S text to validated lossless document and back.
2. Validated durable state to deterministic protected capsule.
3. OpenCode hook input/output to persisted checkpoint plus injected context and
   prompt.
4. `session.compacted` event to successful checkpoint and one-shot recovery.
5. Installer arguments plus existing JSON/JSONC to a minimal, inspectable edit.

## Risks pinned for implementation

- Compaction hooks are experimental.
- Filesystem durability differs by platform; directory fsync must be best effort
  and never be reported as stronger than observed.
- A checkpoint ID cannot include the final capsule digest if the capsule embeds
  that same ID without creating a digest cycle. Use a deterministic transaction
  identity derived from session, ledger revision, and normalized state; compute
  SHA-256 separately over the exact final capsule.
- Duplicate hook calls require an idempotency key and persisted lookup, not only
  an in-memory promise cache.
- Recovery injection must be session-scoped and acknowledged once.
- Secret redaction must run before both persistence and injection.
