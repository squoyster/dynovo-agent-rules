# AGENTS.md

This file routes agent behavior. Keep default-load context small.

AXL means Agent eXecution Language.

Load order:
1. AGENTS.md
2. rules/base.axlr
3. relevant rules/<domain>.axlr only if task materially touches that domain
4. skills/axl-humanize/SKILL.md only for AXL expansion, summarization, or fidelity checks
5. axl/spec.axlr only when editing/extending AXL semantics
6. axl/state-spec.axls only when writing durable ledgers or handoff files

Canonical files:
- rules/base.axlr: default operational rules
- axl/spec.axlr: full rule-language specification
- axl/types.axlt: shared symbols, value sigils, status enums
- axl/state-spec.axls: durable state/ledger file specification
- axl/patch-spec.axlp: patch/update file specification

Non-goals:
- Do not load full AXL spec for routine repo work.
- Do not duplicate canonical rules across files.
- Do not expand read set beyond the active task.
- Do not confuse AXL-R rules with AXL-S state files.
