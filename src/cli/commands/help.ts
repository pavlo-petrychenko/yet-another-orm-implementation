import { print } from "@/cli/output";

export const HELP_TEXT: string = [
  "yaoi — migration CLI",
  "",
  "Usage:",
  "  yaoi <command> [options]",
  "",
  "Commands:",
  "  migrate:make <name>          Generate a new migration file",
  "  migrate:up [--to <name>]     Apply pending migrations (optionally up to <name>)",
  "  migrate:down [--name <name>] Roll back the most recently applied migration",
  "  migrate:status               Print the state of every discovered + applied migration",
  "",
  "Global options:",
  "  --config <path>              Path to yaoi.config.{ts,js}; default: ./yaoi.config.<ext>",
  "  --help, -h                   Show this message",
  "",
  "Configuration:",
  "  Looks for yaoi.config.ts (then .js, .cjs, .mjs) in the current directory.",
  '  Use `defineConfig` from "yaoi" to author it.',
].join("\n");

export function runHelp(): void {
  print(HELP_TEXT);
}
