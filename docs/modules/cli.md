# cli

**Purpose.** A minimal command-line wrapper around `MigrationRunner`. Resolves a user's `yaoi.config.ts` from the current working directory, parses argv, dispatches to one of four subcommands, and translates errors into Unix-style exit codes. The CLI adds nothing to the runner's behaviour — it is a thin shell.

## Architecture

- **`bin/yaoi.js`** — committed, executable, shipped via `package.json#bin`. It is a tiny shebang shim that requires `dist/cli/main.js` and forwards `process.argv.slice(2)`. Built artifacts live in `dist/`; source lives in `src/cli/`.
- **`bin/yaoi.ts`** — committed, executable, **not shipped**. For in-repo development; runs via `npm run cli -- <args>` (which preloads `ts-node/register` and `tsconfig-paths/register`). Equivalent semantics, no build step.
- **`main.ts`** — single entry point. Returns a numeric exit code (does not call `process.exit` — the bin shim does). Steps:
  1. `parseArgs(argv)` → structured `ParsedArgs`.
  2. If `--help` / `-h` / `help` / no command → print usage, return `OK`.
  3. `loadConfig` (with `--config <path>` override). Errors classified as `ConfigNotFoundError` / `ConfigShapeError` → exit `CONFIG`.
  4. Switch on `command`, await the handler. `CliUsageError` → `USAGE`; anything else → `RUNTIME`.
- **`args.ts`** — hand-rolled argv parser. Rules: first non-flag token is the command; `--key=value` and `--key value` both bind; trailing `--key` is boolean true; `--` ends flag parsing; leading flags before the command are accepted. No short-flag aliases (other than `-h`), no `--no-x` negation, no flag clustering.
- **`loadConfig.ts`** — searches the cwd for `yaoi.config.ts`, `.js`, `.cjs`, `.mjs` (in that order) unless `--config` is passed. For `.ts` configs, lazily registers `ts-node` (with `transpileOnly: true` for cold-start speed) and `tsconfig-paths/register` once per process via `createRequire(__filename)`. Validates the loaded module's default export has `migrationsDir: string` and `driver: { type: string; ... }`. Resolves a relative `migrationsDir` against the config file's directory so it works regardless of the cwd at invocation time.
- **`makeRunner.ts`** — translates a `LoadedConfig` into a connected `MigrationRunner` plus a `shutdown()` closure. Uses `DriverFactory.create()` (Postgres only today). Each command handler is responsible for `try { … } finally { await shutdown(); }`.
- **Commands** (`commands/{make,up,down,status,help}.ts`):
  - `migrate:make <name>` — offline (no DB connection). Generates `<YYYYMMDDHHMMSS>_<slug>.ts` in `migrationsDir`, mkdirp the directory if missing, writes `MIGRATION_TEMPLATE`. Refuses to overwrite an existing file (`flag: "wx"`).
  - `migrate:up [--to <name>]` — online. Calls `runner.up({ to })`. Logs `Applied: <name>` to stderr per migration plus a final summary; `No pending migrations.` when nothing to do.
  - `migrate:down [--name <name>]` — online. Calls `runner.down({ name })`. Logs `Rolled back: <name>` or `Nothing to roll back.` to stderr.
  - `migrate:status` — online, read-only. Calls `runner.status()`, renders an aligned table to stdout via `renderStatusTable`. Always exits `OK` (mismatch is a flag, not an error).
- **Output (`output.ts`).** `info` / `warn` / `error` write to stderr (progress, diagnostics). `print` writes to stdout (the only "structured" output: created path from `make`, status table from `status`). `renderStatusTable` is pure, returns a string; column widths are computed from the data and never truncate names.
- **Errors (`errors.ts`).** Three CLI-specific error classes — `CliUsageError`, `ConfigNotFoundError`, `ConfigShapeError`. All other errors (including the migration error classes from Phase 2 — `ChecksumMismatchError`, `OutOfOrderRollbackError`, etc.) surface through the generic catch in `main.ts`.
- **Exit codes (`exitCodes.ts`).** `OK = 0`, `RUNTIME = 1`, `USAGE = 2`, `CONFIG = 3`. The bin shim's top-level `.catch` maps an *unhandled* throw to 1 — so any runtime path that should exit 0/2/3 must `return` the code rather than throw.

## Configuration

Users author `yaoi.config.ts` (or `.js`/`.cjs`/`.mjs`) with `defineConfig` for type assistance:

```ts
import { defineConfig, DBType } from "yaoi";

export default defineConfig({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "yaoi",
    password: process.env.PGPASSWORD ?? "yaoi",
    database: process.env.PGDATABASE ?? "yaoi",
    mode: "pool",
  },
  migrationsDir: "./migrations",
  // tableName?: "yaoi_migrations"
  // fileExtensions?: [".ts", ".js"]
});
```

`defineConfig` is the identity function — it exists purely so the editor and `tsc` can validate the shape against `YaoiConfig`.

## Key types & files

- `main(argv): Promise<number>` — `main.ts:18`
- `parseArgs(argv): ParsedArgs` — `args.ts`; `ParsedArgs = { command, positional, flags }`
- `loadConfig({ cwd?, explicitPath? }): Promise<LoadedConfig>` — `loadConfig.ts`
- `LoadedConfig = { config: YaoiConfig; configPath: string; configDir: string }`
- `makeRunner(loaded): Promise<{ runner, driver, shutdown }>` — `makeRunner.ts`
- `defineConfig(c): YaoiConfig` + `YaoiConfig` — `defineConfig.ts`
- `ExitCode` enum — `exitCodes.ts`
- `MIGRATION_TEMPLATE`, `migrationFileName`, `slugify`, `timestampPrefix` — `template.ts`
- `renderStatusTable(rows): string` — `output.ts`

## Public exports

Value exports (from `src/index.ts`): `defineConfig`, `CliUsageError`, `ConfigNotFoundError`, `ConfigShapeError`.

Type-only exports: `YaoiConfig`.

The rest of the CLI surface (`main`, `loadConfig`, `parseArgs`, …) is internal — re-exported from `@/cli` only for tests and the `bin/` shims.

## Dependencies

- `@/migrations` — every command path either calls `MigrationRunner` directly (`up`/`down`/`status`) or shares its `migrationsDir` (`make`).
- `@/drivers/DriverFactory` — used by `makeRunner` to translate `YaoiConfig.driver` into a connected `Driver`.
- `@/drivers/types/DriverConfig` — type-only; the `driver` field of `YaoiConfig` IS `DriverConfig`.
- `ts-node` + `tsconfig-paths` (already devDeps) — required at runtime *only* when the user's config is a `.ts` file. For `.js` / `.cjs` / `.mjs` configs, they aren't loaded.
- `node:child_process` (in tests, not at runtime) — integration helpers spawn the CLI as a subprocess.

## Gotchas

- **Cold start with `.ts` config.** The first `.ts` config load incurs a `ts-node.register({ transpileOnly: true })` cost (~300 ms in our integration tests). Subsequent calls in the same process are free; for sub-second CI runs, prefer a compiled `.js` config.
- **`--to` / `--name` need values.** A bare trailing `--to` is parsed as boolean `true`. Both `up` and `down` handlers validate `flag === true` and throw `CliUsageError` ("--to requires a migration name") — exit 2.
- **`make` is offline.** It does not open a DB connection. If your config's driver fields are wrong, `migrate:make` will still succeed (the template is written, the runner never instantiates). The error surfaces only on the next `migrate:up`.
- **Filename collisions.** `migrate:make` uses a UTC timestamp prefix (`YYYYMMDDHHMMSS`) to avoid collisions; running it twice with the *same name* in the *same second* will throw `EEXIST`. Wait or run again.
- **`bin/yaoi.js` requires a build.** Until you `npm run build`, the shipped shim points at a non-existent `dist/cli/main.js`. Use `npm run cli -- <args>` for in-repo dev.
- **No multi-environment selection.** There is no `--env`. If you need staging vs. prod, branch on `process.env.NODE_ENV` inside `yaoi.config.ts`.

## Tests

| Kind | File | Purpose |
|---|---|---|
| Unit | `__tests__/args.spec.ts` | argv shapes: positional / `--key=value` / `--key value` / boolean / `--` / leading flags / `-h` |
| Unit | `__tests__/loadConfig.spec.ts` | discover order; explicit `--config`; missing config; missing/invalid `driver` or `migrationsDir`; absolute `migrationsDir` |
| Unit | `__tests__/template.spec.ts` | timestamp prefix shape; slug rules; truncation; idempotence |
| Unit | `__tests__/output.spec.ts` | status-table column alignment, orphan/mismatch rendering, header-only when empty |
| Integration | `__integration__/up.int.spec.ts` | applies in order, no-op re-run, `--to` truncates, broken migration → exit 1, missing `--to` value → exit 2 |
| Integration | `__integration__/down.int.spec.ts` | rolls back most-recent, empty applied set → exit 0, OutOfOrder → exit 1, by-name when matches |
| Integration | `__integration__/status.int.spec.ts` | header alone when empty; applied + pending; mismatch flag; missing config → exit 3 |
| Integration | `__integration__/make.int.spec.ts` | filename shape, missing-name → exit 2, mkdirp |

Integration tests spawn the CLI as a child process with `node -r ts-node/register/transpile-only -r tsconfig-paths/register bin/yaoi.ts <args>`. Helpers live in `src/cli/__integration__/helpers.ts`.

## Where to look next

- `docs/modules/migrations.md` — what `migrate:up` / `:down` / `:status` actually do under the hood.
- `docs/modules/drivers.md` — `DriverFactory.create` and `Driver.connect`/`disconnect` lifecycle.
- `docs/modules/schema-builder.md` — what `Migration.up(schema)` lets you do.
