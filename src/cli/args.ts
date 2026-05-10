export interface ParsedArgs {
  command: string | null;
  positional: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  let command: string | null = null;
  let isParsingFlags = true;
  let i = 0;

  while (i < argv.length) {
    const token = argv[i];

    if (isParsingFlags && token === "--") {
      isParsingFlags = false;
      i += 1;
      continue;
    }

    if (isParsingFlags && token.startsWith("--")) {
      const body = token.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
        i += 1;
        continue;
      }
      const key = body;
      if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        flags[key] = argv[i + 1];
        i += 2;
        continue;
      }
      flags[key] = true;
      i += 1;
      continue;
    }

    if (isParsingFlags && token.startsWith("-") && token.length > 1) {
      const key = token.slice(1);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        flags[key] = argv[i + 1];
        i += 2;
        continue;
      }
      flags[key] = true;
      i += 1;
      continue;
    }

    if (command === null) {
      command = token;
    } else {
      positional.push(token);
    }
    i += 1;
  }

  return { command, positional, flags };
}
