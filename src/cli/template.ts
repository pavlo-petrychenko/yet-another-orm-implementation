export function timestampPrefix(now: Date = new Date()): string {
  const pad = (n: number, w = 2): string => String(n).padStart(w, "0");
  const yyyy = pad(now.getUTCFullYear(), 4);
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export function slugify(name: string, maxLength = 60): string {
  const collapsed = name
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  if (collapsed.length === 0) return "migration";
  return collapsed.slice(0, maxLength);
}

export function migrationFileName(name: string, now: Date = new Date()): string {
  return `${timestampPrefix(now)}_${slugify(name)}.ts`;
}

export const MIGRATION_TEMPLATE: string = [
  `import type { Migration, SchemaBuilder } from "yaoi";`,
  ``,
  `const migration: Migration = {`,
  `  async up(_schema: SchemaBuilder): Promise<void> {`,
  `    // TODO: implement`,
  `  },`,
  `  async down(_schema: SchemaBuilder): Promise<void> {`,
  `    // TODO: implement`,
  `  },`,
  `};`,
  ``,
  `export default migration;`,
  ``,
].join("\n");
