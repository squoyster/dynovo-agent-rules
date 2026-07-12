import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface DynovoSessionState {
  sessionID: string;
  workspaceRoot: string;
  repositoryRoot?: string | undefined;
  activeAgentRole: string;
  activeAgentID?: string | undefined;
  delegationParent?: string | undefined;
  delegatedTaskID?: string | undefined;
  ledgerPath?: string | undefined;
  rulesetRoot: string;
  rulesetCommit?: string | undefined;
  activeOverlays: string[];
  currentPlanID?: string | undefined;
  currentGate?: string | undefined;
  lastCheckpointID?: string | undefined;
  lastCheckpointAt?: string | undefined;
  recoveryDelivered?: boolean | undefined;
}

export async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, "w", 0o600);
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path);
}

const inProcessLocks = new Map<string, Promise<void>>();
const STALE_LOCK_MS = 60_000;

export async function withLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const previous = inProcessLocks.get(path) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  inProcessLocks.set(path, previous.then(() => current));
  await previous;
  const lockPath = `${path}.lock`;
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    await mkdir(dirname(lockPath), { recursive: true });
    for (let attempts = 0; ; attempts += 1) {
      try { handle = await open(lockPath, "wx", 0o600); break; }
      catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempts >= 100) throw error;
        // Locks are advisory. A dead process cannot remove its file, so reclaim
        // only a demonstrably stale lock rather than leaving the session blocked.
        try {
          if (Date.now() - (await stat(lockPath)).mtimeMs > STALE_LOCK_MS) await rm(lockPath, { force: true });
        } catch (staleError: unknown) {
          if ((staleError as NodeJS.ErrnoException).code !== "ENOENT") throw staleError;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    return await operation();
  } finally {
    await handle?.close();
    await rm(lockPath, { force: true });
    release();
    if (inProcessLocks.get(path) === current) inProcessLocks.delete(path);
  }
}

export class SessionRegistry {
  constructor(private readonly root: string, private readonly stateDirectory = ".dynovo") {}

  private get path(): string {
    return join(this.root, this.stateDirectory, "state", "sessions.json");
  }

  async read(): Promise<Record<string, DynovoSessionState>> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as Record<string, DynovoSessionState>;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }

  async get(sessionID: string): Promise<DynovoSessionState | undefined> {
    return (await this.read())[sessionID];
  }

  async put(state: DynovoSessionState): Promise<void> {
    await withLock(this.path, async () => {
      const all = await this.read();
      all[state.sessionID] = state;
      await atomicWrite(this.path, `${JSON.stringify(all, null, 2)}\n`);
    });
  }
}
