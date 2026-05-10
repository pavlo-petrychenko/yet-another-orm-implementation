import type { ParsedArgs } from "@/cli/args";
import { CliUsageError } from "@/cli/errors";
import { ExitCode } from "@/cli/exitCodes";
import type { LoadedConfig } from "@/cli/loadConfig";
import { makeRunner } from "@/cli/makeRunner";
import { info } from "@/cli/output";

export async function runDown(args: ParsedArgs, loaded: LoadedConfig): Promise<number> {
  const nameFlag = args.flags.name;
  if (nameFlag === true) {
    throw new CliUsageError("--name requires a migration name");
  }
  const name = typeof nameFlag === "string" ? nameFlag : undefined;

  const { runner, shutdown } = await makeRunner(loaded);
  try {
    const result = await runner.down(name !== undefined ? { name } : undefined);
    if (result.rolledBack === null) {
      info("Nothing to roll back.");
    } else {
      info(`Rolled back: ${result.rolledBack}`);
    }
    return ExitCode.OK;
  } finally {
    await shutdown();
  }
}
