# Rigorous Multi-Agent Development Process Specification

## Purpose

This document defines mandatory workflow requirements for an agentic
software-development environment. These requirements are normative
("MUST", "MUST NOT", "SHOULD").

The agent is responsible for translating these requirements into the
strongest enforceable mechanisms available in the current environment
(repository rules, workflow engine, CI, hooks, branch protection, task
orchestration, or runtime gates). Prefer mechanical enforcement over
prompt instructions.

------------------------------------------------------------------------

# Core Principles

1.  Correctness before speed.
2.  Every change is traceable.
3.  Every behavior change begins with a failing test.
4.  No agent approves its own work.
5.  Human overrides must be explicit and logged.
6.  Enforcement belongs in tooling whenever possible.

------------------------------------------------------------------------

# Agent Roles

## Coordinator

Responsibilities:

-   decompose work
-   assign agents
-   evaluate gates
-   integrate approved work

Must not:

-   waive failed gates
-   bypass required evidence
-   implement production code except infrastructure for the workflow

## Test Author

May:

-   modify tests
-   create fixtures

Must not:

-   modify production code

## Implementer

May:

-   modify production code
-   add documentation directly related to implementation

Must not:

-   modify tests written during RED
-   weaken assertions
-   disable tests

## Reviewer

Read-only role.

Must independently evaluate:

-   correctness
-   maintainability
-   specification compliance
-   security
-   concurrency
-   architecture

Must not modify code.

------------------------------------------------------------------------

# Mandatory Workflow

## Gate 0 --- Clean Baseline

Require:

-   clean working tree
-   reproducible build
-   all existing tests passing

Abort otherwise.

------------------------------------------------------------------------

## Gate 1 --- Specification

Every task MUST define:

-   objective
-   acceptance criteria
-   out-of-scope items
-   affected components
-   expected tests

No implementation begins without an approved specification.

------------------------------------------------------------------------

## Gate 2 --- RED

Requirements:

-   tests added first
-   tests fail for expected reason
-   production code unchanged

Evidence MUST include:

-   failing test log
-   commit identifier
-   changed file list

------------------------------------------------------------------------

## Gate 3 --- GREEN

Implementation:

-   smallest change satisfying RED
-   no speculative improvements
-   no unrelated refactors

Evidence:

-   targeted tests pass

------------------------------------------------------------------------

## Gate 4 --- REFACTOR

Allowed:

-   simplification
-   duplication removal
-   naming improvements

Must preserve observable behavior.

Full regression suite required.

------------------------------------------------------------------------

## Gate 5 --- Independent Review

Separate reviewers should evaluate:

### Specification Review

-   requirements satisfied
-   nothing omitted
-   nothing extra added

### Engineering Review

-   code quality
-   architecture
-   error handling
-   security
-   performance
-   maintainability
-   test quality

Blocking findings prevent promotion.

------------------------------------------------------------------------

## Gate 6 --- Repository Validation

Require:

-   formatting
-   lint
-   static analysis
-   dependency audit (if configured)
-   unit tests
-   integration tests
-   architecture tests (if present)

No skipped failures.

------------------------------------------------------------------------

## Gate 7 --- Merge

Require:

-   all gates satisfied
-   reviewer approval
-   CI green
-   clean history

------------------------------------------------------------------------

# Enforcement Policy

The agent SHALL automatically install or configure enforcement when
possible, including:

-   pre-commit hooks
-   pre-push hooks
-   CI validation
-   protected branches
-   worktree isolation
-   required reviewers
-   immutable evidence artifacts

If enforcement cannot be automated:

1.  explain why
2.  propose alternatives
3.  mark the requirement as advisory instead of enforced

------------------------------------------------------------------------

# Repository Rules

Prefer:

-   feature branches
-   worktrees for parallel agents
-   atomic commits
-   conventional commit messages
-   signed commits if already enabled

Never:

-   commit secrets
-   disable CI
-   weaken tests to obtain green builds
-   merge failing code

------------------------------------------------------------------------

# Evidence

Each completed task SHALL retain:

-   specification
-   plan
-   failing test log
-   passing test log
-   review findings
-   CI results
-   final summary

These artifacts should be machine-readable where practical.

------------------------------------------------------------------------

# Agent Behavior

Agents should challenge assumptions.

When ambiguity exists:

-   stop
-   request clarification
-   never invent requirements

When a requested shortcut violates this specification:

-   refuse the shortcut
-   explain the violated gate
-   suggest a compliant alternative

------------------------------------------------------------------------

# Success Criteria

The preferred implementation is the one that maximizes:

1.  deterministic enforcement
2.  reproducibility
3.  independent verification
4.  auditability
5.  maintainability

Prompt-based compliance should always be considered weaker than
repository-enforced or CI-enforced compliance.
