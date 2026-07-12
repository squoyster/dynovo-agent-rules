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

  constructor(source: string) {
    this.source = source;
  }

  deleteRecord(blockName: string, id: string): void {
    if (blockName === "PLAN" || blockName === "LOG") {
      throw new Error(`${blockName} is append-only; record ${id} cannot be deleted`);
    }
    const block = this.blocks.get(blockName);
    if (!block) return;
    block.records = block.records.filter((record) => record.id !== id);
  }

  replaceRecord(blockName: string, id: string, fields: Record<string, string>): void {
    if (blockName === "CTX") {
      throw new Error(`CTX is immutable; record ${id} cannot be changed`);
    }
    const record = this.blocks.get(blockName)?.records.find((item) => item.id === id);
    if (!record) throw new Error(`Unknown ${blockName} record: ${id}`);
    record.fields = { ...fields };
  }

  serialize(): string {
    return this.source;
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
      current = { name: header[1]!, records: [] };
      document.blocks.set(current.name, current);
      continue;
    }
    if (!current || !line || line.startsWith("#") || /^\s/.test(line)) continue;
    const record = /^([^\s]+)(?:\s+(.*))?$/.exec(line);
    if (!record) continue;
    current.records.push({ id: record[1]!, fields: parseFields(record[2] ?? ""), raw: line });
  }
  return document;
}

export function serializeAxls(document: AxlsDocument): string {
  return document.serialize();
}
