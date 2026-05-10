import type { ParsedArgs } from "@/cli/args";
import { ExitCode } from "@/cli/exitCodes";
import type { LoadedConfig } from "@/cli/loadConfig";
import { makeRunner } from "@/cli/makeRunner";
import { print, renderStatusTable } from "@/cli/output";

export async function runStatus(_args: ParsedArgs, loaded: LoadedConfig): Promise<number> {
  const { runner, shutdown } = await makeRunner(loaded);
  try {
    const rows = await runner.status();
    print(renderStatusTable(rows));
    return ExitCode.OK;
  } finally {
    await shutdown();
  }
}
