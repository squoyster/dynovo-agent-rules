# dynovo-agents-md

> **Status: experiment.** An agentic DSL built on formal-logic constructs to compress agent instructions into compact, machine-readable policy.

## What this is

An experiment in expressing agent instructions as a tiny formal language (`dox`) instead of prose. Modal and deontic operators (`□` always, `◇` before closeout, `M` must, `F` must-not, `S` should, `P` may, `→` implies, `≻` priority) let rules be parsed, prioritized, and resolved deterministically rather than re-read as English every turn.

Goal: less token noise per turn, unambiguous conflict resolution, and rules that survive being moved between agents/sessions.

## Contents

- `templates/AGENTS.md` — the **DOX-Min v1** boilerplate. The notation, meta-rules, authority model, read-before-edit, update/hierarchy, style/closeout, worktree, gates, permissions, and durable-identity rules.
- `rules/*.md` — domain rule stubs (`git`, `aws`, `java-spring`, `node-react`, `postgres`, `security`, `verification`, `base`). Most are placeholders to be filled in.
- `bin/install-opencode-rules` — idempotently wires the rule URLs into `~/.config/opencode/opencode.json[c]`.
- `templates/opencode.json` — example opencode config stub.

## Install

```bash
./bin/install-opencode-rules        # add DOX rule URLs to opencode config
./bin/install-opencode-rules --force # re-install even if already present
```

Requires `jq` and `curl`.

## Credit

The DOX boilerplate form was inspired by the [DOX project](https://github.com/agent0ai/dox). Go read it.

## License

MIT — see [LICENSE](LICENSE).
