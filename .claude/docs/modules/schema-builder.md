# schema-builder

**Purpose.** Pure DDL AST construction. Mirrors the structure of `query-builder/` for SELECT/INSERT/UPDATE/DELETE, but for `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `RENAME TABLE`. The module emits no SQL — it produces a typed `DdlQuery` IR that downstream dialect compilers in `src/drivers/postgres/dialect/compilers/ddl/` translate to wire SQL.

The two pipelines (DML and DDL) are deliberately disjoint at the type level: `Driver.query()` rejects DDL at compile time, and `Driver.ddl()` rejects DML.

## Architecture

- **`SchemaBuilder` facade** (`SchemaBuilder.ts:6`) is the entry point. It holds a `Driver` and exposes `createTable`, `alterTable`, `dropTable`, `renameTable`, plus convenience helpers `hasTable` (uses `information_schema`) and `raw` (forwards to `driver.raw`). Each builder method constructs the IR and immediately dispatches via `driver.ddl(query)`.
- **`TableBuilder`** (`builders/TableBuilder.ts`) — Knex-fluent column definition. Inside the callback the user adds columns (`t.id()`, `t.text("email").notNull().unique()`, `t.timestamp(...).defaultRaw("NOW()")`), indexes, foreign keys, and table-level constraints. `build()` returns a `CreateTableQuery`.
- **`AlterTableBuilder`** (`builders/AlterTableBuilder.ts`) — collects per-column adds/drops/renames and table-level operations into a single `AlterTableQuery.operations` array. Each Postgres `ALTER TABLE` is emitted as one multi-clause statement (per the locked-in design — not a sequence of individual statements). When `operations.length === 0`, `SchemaBuilder.alterTable` is a no-op.
- **`AlterColumnBuilder`** + **`ColumnBuilder`** + **`ForeignKeyBuilder`** — internal builders used by `TableBuilder` / `AlterTableBuilder` to assemble `ColumnSpec`, `IndexSpec`, `ForeignKeySpec`. Exported from the barrel for advanced consumers.
- **DDL IR (`types/`)** — tagged union `DdlQuery = CreateTableQuery | AlterTableQuery | DropTableQuery | RenameTableQuery`, discriminated by `DdlQueryType`. Each member carries a `TableDescription` (re-used from `query-builder/`) plus its own payload.
- **Postgres compilers** (in `drivers/postgres/dialect/compilers/ddl/`) — one compiler per `DdlQueryType`: `PostgresCreateTableCompiler`, `PostgresAlterTableCompiler`, `PostgresDropTableCompiler`, `PostgresRenameTableCompiler`. `PostgresColumnTypeCompiler` translates `ColumnType` (a tagged union — `int`, `text`, `decimal(p,s)`, `varchar(n)`, `timestamp({ withTimezone })`, …) to the SQL type string. `referentialAction.ts` maps `ReferentialAction` (`"cascade"`, `"set-null"`, `"restrict"`, `"no-action"`, `"set-default"`) to the SQL fragment.
- **Dispatch.** `Dialect.buildDdl(query)` is a separate switch from `Dialect.buildQuery` — they share `CompilationContext` / `ParameterManager` / `DialectUtils` (so identifier-quoting and `?` → `$N` remapping are consistent) but never share types.

## Execution path

```ts
// User code (Phase 1: directly; Phase 2+: inside a Migration's up/down)
await schema.createTable("users", (t) => {
  t.id();                                                      // SERIAL PRIMARY KEY
  t.text("email").notNull().unique();
  t.timestamp("created_at", { withTimezone: true }).defaultRaw("NOW()");
});

// Internals
const tb = new TableBuilder("users");
build(tb);                                                     // populate columns/indexes/FKs
const query: CreateTableQuery = tb.build();                    // pure IR
await driver.ddl(query);                                       // → Dialect.buildDdl → Postgres*Compiler → SQL
```

## Key types & files

- `SchemaBuilder` — `SchemaBuilder.ts:6`
- `DdlQuery` (union) + `DdlQueryType` (enum) — `types/DdlQuery.ts:7,19`
- `CreateTableQuery` — `types/CreateTableQuery.ts`; `AlterTableQuery` + `AlterOperation` + `AlterColumnChanges` — `types/AlterTableQuery.ts`
- `DropTableQuery` (`{ ifExists, cascade }`) — `types/DropTableQuery.ts`; `RenameTableQuery` (`{ to }`) — `types/RenameTableQuery.ts`
- `ColumnSpec` (column descriptor: `name`, `type`, `notNull`, `unique`, `default`, `references`) — `types/ColumnSpec.ts`
- `ColumnType` (tagged union of `int`, `bigint`, `serial`, `text`, `varchar`, `boolean`, `decimal`, `timestamp`, …) — `types/ColumnType.ts`
- `DefaultValue` — literal value, `null`, or `{ kind: "raw", sql: string }` for expressions like `NOW()`
- `IndexSpec`, `ForeignKeySpec`, `ReferentialAction` — sibling types in `types/`

## Public exports

Value exports (from `src/index.ts`): `SchemaBuilder`, `TableBuilder`, `AlterTableBuilder`, `AlterColumnBuilder`, `ColumnBuilder`, `ForeignKeyBuilder`, `DdlQueryType`.

Type-only exports: `DdlQuery`, `DdlQueryCommon`, `CreateTableQuery`, `AlterTableQuery`, `AlterColumnChanges`, `AlterOperation`, `DropTableQuery`, `RenameTableQuery`, `ColumnSpec`, `ColumnType`, `ColumnReference`, `DefaultValue`, `IndexSpec`, `ForeignKeySpec`, `ReferentialAction`.

## Dependencies

- `@/drivers/common/Driver` — `SchemaBuilder` holds a `Driver` and dispatches via `driver.ddl` / `driver.raw`.
- `@/query-builder` — re-uses `TableDescription` for `DdlQueryCommon.table`. **No other dependency on the DML pipeline.**
- No dependency on `metadata`, `decorators`, or `model`. The schema builder is independent of entity metadata; users describe tables explicitly inside `createTable` / `alterTable` callbacks.

## Gotchas

- **Default values:** `t.text("name").default("anon")` parameter-binds the literal; `defaultRaw("NOW()")` emits the raw SQL fragment unbound. Use `defaultRaw` for function calls and `default` for literals.
- **`alterTable` is one statement:** every operation added inside the callback becomes a clause of a single `ALTER TABLE … ADD COLUMN …, DROP COLUMN …, ALTER COLUMN …` statement. If you need separate statements (e.g., to drop and re-add the same column), call `alterTable` twice.
- **`hasTable` uses `current_schema()`:** introspection is scoped to whichever schema is current — typically `public`. Cross-schema tables are not visible.
- **`SchemaBuilder.raw` returns `Promise<void>`:** rows from the underlying `driver.raw` are discarded. For SELECTs, call `driver.raw<TRow>` directly.

## Tests

| Kind | File | Purpose |
|---|---|---|
| Unit | `__tests__/TableBuilder.spec.ts` | column/PK/index/FK shape produced by the builder |
| Unit | `__tests__/AlterTableBuilder.spec.ts` | add/drop/alter operation accumulation |
| Unit | `__tests__/ColumnBuilder.spec.ts` | fluent setters → `ColumnSpec` shape |
| Unit | `__tests__/typeDisjointness.test.ts` | type-level proof that `Driver.query` rejects DDL and `Driver.ddl` rejects DML |
| Integration | `__integration__/createTable.int.spec.ts` | round-trip via real Postgres |
| Integration | `__integration__/alterTable.int.spec.ts` | multi-clause ALTER applied atomically |
| Integration | `__integration__/dropAndRename.int.spec.ts` | DROP `ifExists`/`cascade`; RENAME |
| Integration | `__integration__/e2eParity.int.spec.ts` | byte-equivalent introspection vs. legacy raw-SQL bootstrap |

## Where to look next

- `docs/modules/migrations.md` — uses `SchemaBuilder` to bootstrap `yaoi_migrations` and to drive every migration's `up`/`down`.
- `docs/modules/drivers.md` — `Dialect.buildDdl` dispatch; the eight Postgres DDL compilers under `drivers/postgres/dialect/compilers/ddl/`.
- `docs/modules/query-builder.md` — `TableDescription` is shared; all other DML types are deliberately disjoint.
