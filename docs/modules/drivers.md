# drivers

**Purpose.** Translates query-builder AST nodes into database-wire SQL and executes them. The module owns the full lifecycle: connection management, query compilation, parameter binding, and transaction control.

## Architecture

- **Driver interface → Dialect → compilers:** `Driver` (`common/Driver.ts:5`) exposes `query`, `raw`, and `withTransaction`. It delegates compilation entirely to `Dialect` (`common/Dialect.ts:6`), which builds a `CompilationContext` carrying a fresh `ParameterManager` and `DialectUtils`, then dispatches to a set of statement compilers.
- **Compiler pipeline:** `QueryCompiler<TQuery>` (`compilers/QueryCompiler.ts:4`) is the single-method interface `compile(query, ctx): string`. The 11 specialisations (Select, Insert, Update, Delete, Condition, OrderBy, GroupBy, Join, Limit, Offset, Returning) are instantiated once inside the dialect and wired via constructor injection. `PostgresDialect.buildQuery` creates the `CompilationContext` and calls `dispatch` to route by `QueryType`.
- **CompilationContext as shared state:** `CompilationContext` (`common/CompilationContext.ts:5`) carries the per-query `ParameterManager` and `DialectUtils`, plus two recursive helpers (`compileCondition`, `compileSelect`) that compilers call back into — enabling subquery and `HAVING` compilation without circular imports.
- **PostgreSQL specialisation:** `PostgresDialect` assembles all `Postgres*Compiler` instances. `PostgresParameterManager` emits positional `$1`, `$2` … placeholders. `PostgresDialectUtils` double-quote-escapes identifiers. Raw SQL fragments use `?` and are remapped to positional params by `substituteRawParams` (`dialect/utils/substituteRawParams.ts:5`).
- **Connection strategies:** `PostgresConnection` (`connection/PostgresConnection.ts:4`) is a strategy interface. `PostgresPoolConnection` (default) wraps `pg.Pool` and exposes `withPinnedClient` by checking out a `PoolClient` for the duration of `fn`. `PostgresClientConnection` (`mode: "client"`) wraps a single `pg.Client` and satisfies `withPinnedClient` by returning `this`.
- **Nested transactions:** `PostgresTransactionalDriver` (`PostgresTransactionalDriver.ts:10`) is an internal `Driver` pinned to a single connection. A `depth` counter drives the protocol: `depth === 0` → `BEGIN/COMMIT/ROLLBACK`; `depth ≥ 1` → `SAVEPOINT sp_N / RELEASE / ROLLBACK TO`.

## Key types & files

- `Driver` — `common/Driver.ts:5`; `Dialect` — `common/Dialect.ts:6`; `ParameterManager` — `common/ParameterManager.ts:1`; `DialectUtils` — `common/DialectUtils.ts:3`; `CompilationContext` — `common/CompilationContext.ts:5`
- `CompiledQuery` — `types/CompiledQuery.ts:1` (`{ sql, params }`)
- `QueryResult<TRow>` — `types/QueryResult.ts:1` (`rows`, `rowCount`, optional `insertId`/`affectedRows`)
- `DriverConfig` (discriminated union) — `types/DriverConfig.ts:30`; `DBType` enum — `types/DBType.ts:1`
- `DriverFactory.create(config)` — `DriverFactory.ts:8`; only `DBType.POSTGRES` is implemented
- `PostgresConditionCompiler.compileTopLevel` — `dialect/compilers/PostgresConditionCompiler.ts:21`; strips the outer parens that `compileGroup` adds, used for `WHERE`/`HAVING`

## Public exports

Value exports (from `src/index.ts`): `DriverFactory`, `DBType`, `DriverError`, `NotImplementedError`, `PostgresDriver`, `PostgresDialect`, `PostgresDialectUtils`, `PostgresParameterManager`.

Type-only exports: `Driver`, `Dialect`, `DialectUtils`, `ParameterManager`, `CompilationContext`, `QueryCompiler`, `SelectCompiler`, `InsertCompiler`, `UpdateCompiler`, `DeleteCompiler`, `ConditionCompiler`, `OrderByCompiler`, `GroupByCompiler`, `LimitCompiler`, `OffsetCompiler`, `ReturningCompiler`, `JoinCompiler`, `DriverConfig`, `PostgresDriverConfig`, `MySqlDriverConfig`, `SqliteDriverConfig`, `CompiledQuery`, `QueryResult`.

## Dependencies

- `@/query-builder` — all AST types (`Query`, `SelectQuery`, `InsertQuery`, …, `ConditionClause`, `JoinClause`, etc.) and `QueryType`/`ConditionType`/`LogicalOperator` enums
- `pg` (npm) — `Pool`, `Client`, `PoolClient` used only inside `postgres/connection/`

## Gotchas

- **Transaction pinning:** `PostgresPoolConnection.withPinnedClient` checks out a `PoolClient` for the lifetime of `fn` and releases it in `finally`. Forgetting to await `withTransaction` will release the client before the transaction body runs.
- **Connection mode:** `PostgresDriverConfig.mode` defaults to `"pool"`. `mode: "client"` uses a single long-lived `pg.Client`; `connect()` must be called explicitly, and there is no pooling — unsuitable for concurrent workloads.
- **Raw `?` remapping:** `substituteRawParams` counts `?` vs params and throws on mismatch. `UPDATE` and `DELETE` silently drop `ORDER BY`/`LIMIT` clauses present in the AST (PostgreSQL does not support them on those statements).

## Tests

17 spec files under `src/drivers/postgres/__integration__/` (7 integration suites + helpers/setup/teardown); no unit test files under `src/drivers/__tests__/`.
