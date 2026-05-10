import { parseArgs } from "@/cli/args";
import { runDown } from "@/cli/commands/down";
import { runHelp } from "@/cli/commands/help";
import { runMake } from "@/cli/commands/make";
import { runStatus } from "@/cli/commands/status";
import { runUp } from "@/cli/commands/up";
import {
  CliUsageError,
  ConfigNotFoundError,
  ConfigShapeError,
} from "@/cli/errors";
import { ExitCode } from "@/cli/exitCodes";
import { loadConfig } from "@/cli/loadConfig";
import type { LoadedConfig } from "@/cli/loadConfig";
import { error } from "@/cli/output";

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);

  if (args.flags.help === true || args.flags.h === true) {
    runHelp();
    return ExitCode.OK;
  }

  if (args.command === null || args.command === "help") {
    runHelp();
    return ExitCode.OK;
  }

  let loaded: LoadedConfig;
  try {
    const explicit = args.flags.config;
    loaded = await loadConfig({
      explicitPath: typeof explicit === "string" ? explicit : undefined,
    });
  } catch (err) {
    if (err instanceof ConfigNotFoundError || err instanceof ConfigShapeError) {
      error(err.message);
      return ExitCode.CONFIG;
    }
    throw err;
  }

  try {
    switch (args.command) {
      case "migrate:make":
        return await runMake(args, loaded);
      case "migrate:up":
        return await runUp(args, loaded);
      case "migrate:down":
        return await runDown(args, loaded);
      case "migrate:status":
        return await runStatus(args, loaded);
      default:
        error(`Unknown command: ${args.command}`);
        runHelp();
        return ExitCode.USAGE;
    }
  } catch (err) {
    if (err instanceof CliUsageError) {
      error(err.message);
      runHelp();
      return ExitCode.USAGE;
    }
    error(err instanceof Error ? err.message : String(err));
    return ExitCode.RUNTIME;
  }
}
