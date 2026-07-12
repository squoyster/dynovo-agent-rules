export interface AxlsRecord {
  id: string;
  fields: Record<string, string>;
  raw: string;
}

export interface AxlsBlock {
  name: string;
  records: AxlsRecord[];
}

export class AxlsDocument {
  readonly blocks = new Map<string, AxlsBlock>();
  private readonly source: string;
  private readonly appended: Array<{ blockName: string; raw: string }> = [];
  private mutated = false;

  constructor(source: string) {
    this.source = source;
  }

  deleteRecord(blockName: string, id: string): void {
    throw new Error(`${blockName} is append-only and source-preserving; record ${id} cannot be deleted`);
  }

  replaceRecord(blockName: string, id: string, fields: Record<string, string>): void {
    void fields;
    throw new Error(`${blockName} is immutable and source-preserving; record ${id} cannot be replaced`);
  }

  serialize(): string {
    if (!this.appended.length && !this.mutated) return this.source;
    if (this.mutated) return [...this.blocks.values()].map((block) => `@${block.name}\n${block.records.map((record) => record.raw).join("\n")}`).join("\n\n") + "\n";
    const extension = this.appended.map(({ blockName, raw }) => `@${blockName}\n${raw}`).join("\n\n");
    return `${this.source.replace(/\n?$/, "\n")}\n${extension}\n`;
  }

  appendRecord(blockName: string, id: string, fields: Record<string, string>): void {
    const block = this.blocks.get(blockName) ?? { name: blockName, records: [] };
    this.blocks.set(blockName, block);
    const pairs = Object.entries(fields)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${key}=${/\s/.test(item) ? JSON.stringify(item) : item}`);
    const raw = [id, ...pairs].join(" ");
    block.records.push({ id, fields: { ...fields }, raw });
    this.appended.push({ blockName, raw });
  }
}

function parseFields(input: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)=("(?:[^"\\]|\\.)*"|[^\s]+)/g;
  for (const match of input.matchAll(pattern)) {
    const [, key, value] = match;
    if (!key || value === undefined) continue;
    fields[key] = value.startsWith('"') ? value.slice(1, -1).replace(/\\"/g, '"') : value;
  }
  return fields;
}

export function parseAxls(source: string): AxlsDocument {
  const document = new AxlsDocument(source);
  let current: AxlsBlock | undefined;

  for (const line of source.split(/\n/)) {
    const header = /^@([A-Z][A-Z0-9_]*)\s*$/.exec(line);
    if (header) {
      current = document.blocks.get(header[1]!) ?? { name: header[1]!, records: [] };
      document.blocks.set(header[1]!, current);
      continue;
    }
    if (!current || !line || line.startsWith("#") || /^\s/.test(line)) continue;
    const field = /^([a-z][a-z0-9_]*):\s*(.*)$/.exec(line);
    if (field) {
      current.records.push({ id: field[1]!, fields: { value: field[2] ?? "" }, raw: line });
      continue;
    }
    const record = /^([^\s]+)(?:\s+(.*))?$/.exec(line);
    if (!record) continue;
    current.records.push({ id: record[1]!, fields: parseFields(record[2] ?? ""), raw: line });
  }
  return document;
}

export function serializeAxls(document: AxlsDocument): string {
  return document.serialize();
}
