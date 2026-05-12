# migrations

**Purpose.** Programmatic migration runner: discovers migration files on disk, tracks which ones have been applied in a `yaoi_migrations` table, runs each migration's `up`/`down` callbacks inside a transaction, and refuses to run anything once an applied file's contents have drifted (checksum enforcement). The runner is the surface; the CLI in `src/cli/` is a thin wrapper around it.

## Architecture

- **`MigrationRunner`** (`MigrationRunner.ts:33`) — facade with three public methods: `up({ to? })`, `down({ name? })`, `status()`. It owns no mutable state; all state lives in the `yaoi_migrations` table and on disk.
- **Tracking table.** `ensureTrackingTable` (`trackingTable.ts:26`) creates `yaoi_migrations` (columns: `id` SERIAL PK, `name` TEXT NOT NULL UNIQUE, `checksum` TEXT NOT NULL, `applied_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()) using `SchemaBuilder` itself — Phase 1 dogfooding. CRUD helpers (`readApplied`, `recordApplied`, `deleteApplied`) use `driver.raw` directly because `SchemaBuilder.raw` discards rows.
- **Bootstrap is locked.** `MigrationRunner.bootstrap()` wraps `ensureTrackingTable` in `withTransaction` + `acquireRunnerLock` — without this, two concurrent runners can both call `CREATE TABLE IF NOT EXISTS` and one will hit `pg_class_relname_nsp_index` duplicate-key. The advisory lock serialises the system-catalog write.
- **Loader.** `discoverMigrations` (`loader.ts`) reads the migrations directory, filters by extension (`.ts` / `.js` by default), strips `.d.ts` / `.spec.` / `.test.`, sorts lexicographically, returns `DiscoveredMigration[]`. Each entry has `name` (filename without extension), `absolutePath`, and `load()` (a closure that does `await import(absolutePath)`, validates `up`/`down` are functions, and returns a `Migration`). `mod.default ?? mod` — supports both `export default migration` and bare `exports.up = ...` shapes.
- **Checksum.** `fileChecksum` (`checksum.ts`) is SHA-256 over the raw file bytes, hex-encoded (64 chars). Computed over source bytes — switching from `.ts` (ts-node) to compiled `.js` registers as a checksum change. Each project should commit to one mode.
- **Advisory lock.** `acquireRunnerLock` (`advisoryLock.ts`) calls `SELECT pg_advisory_xact_lock($1)` with key `0x59414f49` (ASCII `"YAOI"`). The lock is held for the surrounding transaction. Used in `bootstrap()` and inside every `up()` / `down()` step's transaction so concurrent runners block each other rather than racing.
- **Per-migration transaction.** Each `up()` step runs `driver.withTransaction(async (tx) => { acquireRunnerLock(tx); /* re-read applied to detect race */; await migration.up(new SchemaBuilder(tx)); await recordApplied(tx, ...); })`. If the user's `up()` throws, the whole transaction rolls back: no schema change AND no tracking row, atomically. Postgres DDL is transactional, so this works.
- **Checksum enforcement on read.** Before applying any pending migration, `verifyAppliedChecksums` recomputes the checksum of every already-applied file and compares against the stored one. Mismatch → `ChecksumMismatchError`. Missing file → `MissingMigrationFileError`. `down()` does the same check for the migration about to be rolled back. `status()` exposes the same information without throwing — that's the whole reason `status()` exists.

## Execution paths

### `runner.up({ to? })`

1. `bootstrap()` — locks + creates tracking table.
2. `discoverFiles()` + `readApplied(driver)`.
3. `verifyAppliedChecksums(applied, files)` — throws on drift.
4. Compute pending = files \ applied. If `to` is set and matches a pending entry, truncate inclusive; if `to` is unknown, throw `MigrationNotFoundError`; if `to` is already applied, return `{ applied: [] }`.
5. For each pending in order:
   - `await driver.withTransaction(async (tx) => { … })` — lock, re-read applied (skip if a parallel runner already applied this), run `migration.up`, record row, return `true`/`false`.
   - Append name to `newlyApplied` if applied this turn.
6. Return `{ applied: newlyApplied }`.

### `runner.down({ name? })`

1. `bootstrap()` + `readApplied`.
2. If applied is empty → `{ rolledBack: null }`.
3. `pickMostRecent(applied)` — max `applied_at`, ties broken by max `id`.
4. If `name` is set and ≠ most-recent → `OutOfOrderRollbackError`. **Single-migration rollback only — by design, Phase 2 footgun protection.**
5. Verify file presence + checksum (throws `MissingMigrationFileError` / `ChecksumMismatchError` on drift).
6. `driver.withTransaction`: lock, run `migration.down`, delete tracking row.
7. Return `{ rolledBack: name }`.

### `runner.status()`

Read-only. Returns `MigrationStatus[]` sorted by name. **Never throws on drift** — exposes:

- `applied` — true if a tracking row exists
- `appliedAt` — Date or null
- `storedChecksum` — string or null (null when pending)
- `fileChecksum` — string or null (null when the file was deleted: orphan)
- `mismatch` — true only when `applied && fileChecksum !== null && stored !== current`

## Key types & files

- `MigrationRunner` — `MigrationRunner.ts:33`; `bootstrap` private method at `:150`
- `Migration` interface — `types.ts:4` (`{ up(schema): Promise<void>; down(schema): Promise<void> }`)
- `MigrationStatus` — `types.ts:9`; `MigrationRunnerOptions` — `types.ts:18`; `AppliedRow` — `types.ts:25`
- `DEFAULT_TABLE_NAME = "yaoi_migrations"` — `trackingTable.ts:11`; `DEFAULT_FILE_EXTENSIONS = [".ts", ".js"]` — `loader.ts`
- Errors — `errors.ts`: `ChecksumMismatchError`, `MissingMigrationFileError`, `InvalidMigrationFileError`, `OutOfOrderRollbackError`, `MigrationNotFoundError`. All have an explicit `name` field for cross-module `instanceof`.
- `acquireRunnerLock` — `advisoryLock.ts`; lock key `0x59414f49`
- `fileChecksum(absolutePath): Promise<string>` — `checksum.ts`

## Public exports

Value exports (from `src/index.ts`): `MigrationRunner`, `ChecksumMismatchError`, `MissingMigrationFileError`, `InvalidMigrationFileError`, `OutOfOrderRollbackError`, `MigrationNotFoundError`, `DEFAULT_TABLE_NAME`, `DEFAULT_FILE_EXTENSIONS`, `ensureTrackingTable`, `discoverMigrations`, `fileChecksum`.

Type-only exports: `Migration`, `MigrationStatus`, `MigrationRunnerOptions`, `UpResult`, `DownResult`, `DiscoveredMigration`.

## Dependencies

- `@/drivers/common/Driver` — `withTransaction`, `raw`, `ddl`, `isConnected` are the only primitives used. No new method added to `Driver` for migrations.
- `@/schema-builder/SchemaBuilder` — passed into every `up`/`down` callback, and used by `ensureTrackingTable` to dogfood Phase 1.
- `node:crypto` (`createHash`), `node:fs/promises`, `node:path` — for the loader and checksum.
- No dependency on `metadata`, `decorators`, `model`, or the CLI. The runner is consumable as a library.

## Gotchas

- **`SchemaBuilder.raw` returns `void`.** `trackingTable.ts` uses `driver.raw<TRow>()` directly so SELECTs return rows.
- **Postgres DDL is transactional.** A failed `up()` rolls back BOTH the schema change AND the tracking row insert — atomically. This is load-bearing; the CLI tests verify it.
- **Two-runner race protection.** Inside the locked transaction, `up()` re-reads the applied set and skips the migration if another process applied it first. This is why `up()` returns `{ applied: string[] }` (only what *this runner* applied), not the full pending count.
- **Out-of-order rollback is rejected.** By design — rolling back a non-most-recent migration is a footgun in Phase 2. If you need it, roll back to the target one step at a time.
- **`.ts` ↔ `.js` mode switch breaks checksums.** Migration source bytes are the input — switching the project from `ts-node` execution to compiled JS will invalidate every existing tracking row. Don't switch mid-stream.
- **Lock key is project-wide.** `0x59414f49` is shared by every `MigrationRunner` instance (and every CLI invocation). Two runners against the *same* database serialise; runners against different databases don't interfere.

## Tests

| Kind | File | Purpose |
|---|---|---|
| Unit | `__tests__/checksum.spec.ts` | deterministic SHA-256 over a fixture |
| Unit | `__tests__/errors.spec.ts` | each error class's name + message format |
| Unit | `__tests__/loader.spec.ts` | dir reads, extension filter, sort, invalid-shape rejection |
| Unit | `__tests__/trackingTable.spec.ts` | `ensureTrackingTable` DDL shape via a mock driver that captures `ddl()` calls |
| Integration | `__integration__/up.int.spec.ts` | ordered apply, no-op re-run, transaction rollback, `to`, **two parallel runners** |
| Integration | `__integration__/down.int.spec.ts` | rollback most-recent, by-name, OutOfOrderRollbackError, empty applied set |
| Integration | `__integration__/status.int.spec.ts` | applied + pending + orphan + mismatch flags |
| Integration | `__integration__/checksum.int.spec.ts` | tampered file blocks `up()` and `down()` |

## Where to look next

- `docs/modules/cli.md` — the user-facing wrapper: `yaoi.config.ts` resolution, command dispatch, exit codes.
- `docs/modules/schema-builder.md` — what every migration's callback receives (`SchemaBuilder`).
- `docs/modules/drivers.md` — `withTransaction` semantics, advisory-lock-friendly connection pinning.
