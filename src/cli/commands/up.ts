import type { ParsedArgs } from "@/cli/args";
import { CliUsageError } from "@/cli/errors";
import { ExitCode } from "@/cli/exitCodes";
import type { LoadedConfig } from "@/cli/loadConfig";
import { makeRunner } from "@/cli/makeRunner";
import { info } from "@/cli/output";

export async function runUp(args: ParsedArgs, loaded: LoadedConfig): Promise<number> {
  const toFlag = args.flags.to;
  if (toFlag === true) {
    throw new CliUsageError("--to requires a migration name");
  }
  const to = typeof toFlag === "string" ? toFlag : undefined;

  const { runner, shutdown } = await makeRunner(loaded);
  try {
    const result = await runner.up(to !== undefined ? { to } : undefined);
    if (result.applied.length === 0) {
      info("No pending migrations.");
    } else {
      for (const name of result.applied) info(`Applied: ${name}`);
      info(`Applied ${String(result.applied.length)} migration(s).`);
    }
    return ExitCode.OK;
  } finally {
    await shutdown();
  }
}
