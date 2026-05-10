import { promises as fs } from "node:fs";
import path from "node:path";

import type { ParsedArgs } from "@/cli/args";
import { CliUsageError } from "@/cli/errors";
import { ExitCode } from "@/cli/exitCodes";
import type { LoadedConfig } from "@/cli/loadConfig";
import { info, print } from "@/cli/output";
import { migrationFileName, MIGRATION_TEMPLATE } from "@/cli/template";

export async function runMake(args: ParsedArgs, loaded: LoadedConfig): Promise<number> {
  if (args.positional.length === 0 || args.positional[0].length === 0) {
    throw new CliUsageError("migrate:make requires a migration name");
  }
  const name = args.positional[0];

  const fileName = migrationFileName(name);
  const dir = loaded.config.migrationsDir;
  const fullPath = path.join(dir, fileName);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, MIGRATION_TEMPLATE, { flag: "wx" });

  info(`Created migration: ${fileName}`);
  print(fullPath);
  return ExitCode.OK;
}
