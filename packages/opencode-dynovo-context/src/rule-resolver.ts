import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export interface ActiveObligation { id: string; text: string }
const cache = new Map<string, { mtimeMs: number; obligations: ActiveObligation[] }>();

function safePath(root: string, path: string): string {
  const candidate = resolve(root, path);
  if (relative(root, candidate).startsWith("..") || isAbsolute(relative(root, candidate))) throw new Error(`Rule path escapes ruleset root: ${path}`);
  return candidate;
}

export async function resolveActiveObligations(root: string, paths: string[], role = "all", facts: Record<string, boolean> = {}): Promise<ActiveObligation[]> {
  const results: ActiveObligation[] = [];
  for (const path of [...new Set(paths)].sort()) {
    const absolute = safePath(root, path);
    const info = await stat(absolute);
    const obligations = (await readFile(absolute, "utf8")).split("\n").flatMap((line) => {
      const match = /^([A-Z][A-Z0-9]+):\s+([^|]+)\|\s*([^\s(]+).*?->\s+([MFSP][a-z]*)\s+(.+?)(?:\s+\[|$)/.exec(line);
      if (!match || (match[2]!.trim() !== "all" && match[2]!.trim() !== role)) return [];
      const trigger = match[3]!;
      if (trigger !== "all" && facts[trigger] !== true) return [];
      return [{ id: match[1]!, text: match[5]!.trim() }];
    });
    cache.set(absolute, { mtimeMs: info.mtimeMs, obligations });
    results.push(...obligations);
  }
  return results.sort((left, right) => left.id.localeCompare(right.id));
}
