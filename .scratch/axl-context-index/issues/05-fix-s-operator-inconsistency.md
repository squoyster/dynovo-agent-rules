Status: ready-for-agent

## What to build

`rules/base.axlr` defines `S: should_unless_blocked` in its `@NOTATION` block. Other files and references use `S: should`. Pick one canonical definition and apply it consistently.

The full form `should_unless_blocked` is more precise but verbose. The short form `should` is conventional. Decide which is canonical, then update all notation blocks to match.

Check: `rules/base.axlr`, `axl/spec.axlr`, `axl/types.axlt`, and any other file with a `@NOTATION` block.

## Acceptance criteria

- [ ] One canonical definition of `S` is used across all files
- [ ] No file defines `S` differently from the canonical form
- [ ] The choice is documented in `axl/types.axlt`

## Blocked by

None — can start immediately.
