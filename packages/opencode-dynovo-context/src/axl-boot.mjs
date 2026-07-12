// evaluate-axl.mjs
//
// Re-run the AXL bootstrap when its prior evaluated state was lost through
// compaction, session reconstruction, or context replacement.

import { randomBytes } from "node:crypto";

const newCanary = () =>
  `AXL-${randomBytes(6).toString("hex").toUpperCase()}`;

export default async () => {
  const sessions = new Map();

  return {
    "experimental.chat.system.transform": async (input, output) => {
      output.system ??= [];

      const sessionID = input.sessionID;

      /*
       * If OpenCode does not provide a session ID, use a fresh canary.
       * This causes a safe redundant bootstrap rather than sharing continuity
       * state across unrelated sessions.
       */
      const canary = sessionID
        ? (sessions.get(sessionID) ?? newCanary())
        : newCanary();

      if (sessionID) {
        sessions.set(sessionID, canary);
      }

      const completionRef =
        `^AXL_BOOTSTRAP_COMPLETE:${canary}`;

      output.system.push(`
YOU MUST (M) EXECUTE THE FOLLOWING BEFORE ANY OTHER ACTION:

<AXL_CONTINUITY canary="${canary}">

REFERENCE SEMANTICS

A value beginning with \`^\` is a reference to information present in the
active conversational/model context.

It is not an environment variable, shell variable, filesystem value,
configuration value, plugin-state value, or external resource.

CONTEXT CONTINUITY CHECK

Inspect only the conversational/model context supplied to this model request.

Determine whether this exact reference was retained from an earlier turn:

${completionRef}

Do not use tools, shell commands, environment inspection, filesystem reads,
configuration lookup, or external storage to search for this reference.

The occurrence inside this current <AXL_CONTINUITY> system instruction does
not count. Only an occurrence retained from an earlier turn or reconstructed
session context counts.

BOOTSTRAP

If the prior occurrence cannot be positively identified, treat the evaluated
AXL state as unavailable and execute the AXL bootstrap:

1. Evaluate every \`@DISCLOSURE\` rule independently, top to bottom.
2. Load \`D001\` and \`D002\` first.
3. Load only additional disclosures whose conditions match.
4. Treat loaded AXL-R files as executable policy, not documentation.
5. Scan every loaded rule and obey each matching norm.
6. Never recurse through disclosure IDs.
7. Never infer an unlisted disclosure load.
8. \`{name}\` denotes a placeholder, not literal path text.

After successful bootstrap, preserve this exact reference verbatim in the
assistant-visible session context:

${completionRef}

If the earlier reference is retained, do not repeat the full bootstrap.
Continue applying the retained AXL rules normally.

</AXL_CONTINUITY>
`);
    },
  };
};
