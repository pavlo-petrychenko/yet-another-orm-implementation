import { promises as fs } from "node:fs";
import path from "node:path";

import { InvalidMigrationFileError } from "@/migrations/errors";
import type { Migration } from "@/migrations/types";

export interface DiscoveredMigration {
  name: string;
  absolutePath: string;
  load(): Promise<Migration>;
}

export const DEFAULT_FILE_EXTENSIONS: readonly string[] = [".ts", ".js"];

export async function discoverMigrations(
  dir: string,
  extensions: readonly string[] = DEFAULT_FILE_EXTENSIONS,
): Promise<DiscoveredMigration[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter(
      (e) =>
        e.isFile()
        && extensions.some((ext) => e.name.endsWith(ext))
        && !e.name.endsWith(".d.ts")
        && !e.name.includes(".spec.")
        && !e.name.includes(".test."),
    )
    .map((e) => e.name)
    .sort();

  return files.map((fileName) => {
    const absolutePath = path.join(dir, fileName);
    return {
      name: stripExtension(fileName, extensions),
      absolutePath,
      load: () => loadMigrationFile(absolutePath),
    };
  });
}

function stripExtension(fileName: string, extensions: readonly string[]): string {
  for (const ext of extensions) {
    if (fileName.endsWith(ext)) return fileName.slice(0, -ext.length);
  }
  return fileName;
}

async function loadMigrationFile(absolutePath: string): Promise<Migration> {
  const mod = (await import(absolutePath)) as Record<string, unknown>;
  const candidate = (mod.default ?? mod) as { up?: unknown; down?: unknown };
  if (typeof candidate.up !== "function" || typeof candidate.down !== "function") {
    throw new InvalidMigrationFileError(
      absolutePath,
      "must export both 'up' and 'down' async functions",
    );
  }
  return {
    up: candidate.up as Migration["up"],
    down: candidate.down as Migration["down"],
  };
}
