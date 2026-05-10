#!/usr/bin/env -S npx ts-node -r tsconfig-paths/register
import { main } from "@/cli/main";

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    process.stderr.write(
      `${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
    );
    process.exit(1);
  });
