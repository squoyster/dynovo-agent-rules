# AGENTS.md

This file is the root router for agent behavior. Keep default-load context small.

`RuleRoot` := directory or source URI containing this file. Resolve routed paths below from `RuleRoot`, not the active session directory.

## Objective

Provide compact, machine-readable agent rules that maximize utility per token and load deeper material only when relevant.

## Canonical files

- `rules/base.md` — default operational rules; read for any non-trivial task.
- `skills/axl-humanize/SKILL.md` — on-demand workflow for faithful AXL expansion, source-summary humanization, and transformation-fidelity assessment.
- `axl_agentic_coding_dsl_complete.md` — canonical full AXL reference and design spec, including humanization and PSTL context-ledger extensions; read only when extending syntax, resolving ambiguity in rule semantics, evolving the framework, or designing resumability/compression behavior.
- `rules/*.md` — domain overlays; read only when the task materially touches that domain.

## Read order

1. `AGENTS.md`
2. `rules/base.md`
3. relevant `rules/<domain>.md` only if applicable
4. `skills/axl-humanize/SKILL.md` only for translation, humanization, or fidelity assessment
5. `axl_agentic_coding_dsl_complete.md` only if base rules are insufficient for the task or the task is about DSL semantics or context-ledger design

## Load only if

- `rules/git.md` — branching, commits, pushes, PRs, worktrees, release flow
- `rules/verification.md` — test strategy, gates, evidence, closeout verification
- `rules/security.md` — secrets, auth, permissions, data sensitivity, destructive operations
- `rules/aws.md` — AWS infrastructure, IAM, networking, deployment, cloud data
- `rules/node-react.md` — Node, frontend, React, TypeScript, package scripts
- `rules/java-spring.md` — Java, Spring, JVM build and test flow
- `rules/postgres.md` — schema, queries, migrations, transactional behavior
- `skills/axl-humanize/SKILL.md` — AXL expansion, readable source summaries, or transformation-fidelity comparisons
- `axl_agentic_coding_dsl_complete.md` — only when the task needs full DSL semantics, AXL-to-human translation rules, or PSTL/resume/compression design

## Non-goals

- Do not load the full AXL spec by default for routine repo work.
- Do not duplicate canonical rules across multiple files unless a local overlay needs narrower scope.
- Do not expand the read set beyond files needed for the active task.

## Routing policy

- If a task is routine, prefer `rules/base.md` plus only the directly relevant project files.
- If a task is domain-specific, load the matching overlay in `rules/`.
- If a task changes the rule language, parser assumptions, file-layout conventions, humanization behavior, or context-ledger/resume semantics, load `axl_agentic_coding_dsl_complete.md`.
