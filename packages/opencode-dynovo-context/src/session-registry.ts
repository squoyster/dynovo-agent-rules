import { mkdir, open, readFile, rename } from "node:fs/promises";
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
    const all = await this.read();
    all[state.sessionID] = state;
    await atomicWrite(this.path, `${JSON.stringify(all, null, 2)}\n`);
  }
}
