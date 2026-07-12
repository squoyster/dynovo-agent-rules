# AXL Router Tactical MVP

Source: `docs/axl-router-agentic-spec.md`

## Objective

Deploy a small primary OpenCode router that classifies the current request,
preserves current-user authority, enforces the red/review/validation gates,
selects an existing specialist tier, supplies the required AXL policy bundle,
and alone accepts global workflow transitions.

## Included

- `agents/router.axlr` as the primary control-plane prompt.
- Existing `explore`, `scout`, `plan*`, `general`, and `build*` agents as the
  tactical specialist catalog.
- Explicit request classification, mutation authority, state ownership,
  policy projection, dispatch boundary, evidence validation, and independent
  review rules.
- Self-contained deployment of AXL, rule, agent, skill, spec, and plugin files.
- Optional `--activate-router` migration that reuses the existing orchestrator
  model and permissions while changing its prompt and default name to `router`.

## Deferred

- A persistent mechanical workflow-state engine.
- Structured dispatch/result schema enforcement at every tool boundary.
- Separate `reviewer`, `validator`, and `test-author` OpenCode registrations.
- Dedicated step-planner files for every model tier.
- Railguard interception of side-effecting tool calls.

## Acceptance criteria

1. The deployed bundle contains `AGENTS.md`, AXL types, base rules, router and
   specialist definitions, encoding skills, source specs, and the built plugin.
2. OpenCode instructions and plugin paths resolve only through the deployed
   bundle when installation completes.
3. `--activate-router` makes `router` the default primary agent without changing
   the existing orchestrator model or permission settings.
4. A standalone manually configured `axl-boot.mjs` entry is removed because the
   main plugin now owns boot continuity.
5. macOS JSONC comments and portable array insertion remain intact.
6. AXL validation, package tests, typecheck, build, and resolved OpenCode config
   validation pass.
