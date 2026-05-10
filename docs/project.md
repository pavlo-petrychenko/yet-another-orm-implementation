## YAOI — Yet Another ORM Implementation

A coursework TypeScript ORM targeting PostgreSQL via `pg`. The codebase is organised into eight strictly layered modules under `src/`, plus a CLI shipped as `bin/yaoi`. Per-module deep-dives live in `docs/modules/`.

## Module map

| Module | Role | Depends on |
|---|---|---|
| `query-builder/` | Pure DML AST construction (no SQL emitted) | — (leaf) |
| `schema-builder/` | Pure DDL AST construction (no SQL emitted) | `query-builder/types` (`TableDescription` only) |
| `metadata/` | Global registry of entities/columns/relations | `query-builder/types` |
| `decorators/` | Class/field decorators that populate metadata | `metadata`, `model/repositoryRegistry` |
| `drivers/` | Compile DML + DDL AST → SQL, run, manage connections/tx | `query-builder`, `schema-builder` |
| `model/` | Repository, BaseModel, includes, cascades | `decorators`, `metadata`, `query-builder`, `drivers` |
| `migrations/` | Programmatic migration runner + tracking table + checksum enforcement | `schema-builder`, `drivers` |
| `cli/` | `bin/yaoi` + `yaoi.config.ts` loader + `migrate:*` commands | `migrations`, `drivers` |

Layering is acyclic. `query-builder` and `schema-builder` are the leaves; `model` is the read/write apex; `migrations` and `cli` are the schema-evolution apex (independent of `model`). The DML and DDL pipelines are deliberately disjoint at the type level — `Driver.query` rejects DDL and `Driver.ddl` rejects DML.

## Architecture in one diagram

```
  user code
     │  @Entity / @Column / @Relation       BaseModel.find / repo.find / qb()
     ▼                                                    │
  decorators ──registers──► metadata ◄──reads── model ◄───┘
                                                │
                                  builds Query  ▼
                                          query-builder (DML AST)
                                                │
                                  compiles ▼
                                           drivers ──pg──► PostgreSQL
                                              ▲
                                              │ DDL AST
                                              │
  yaoi CLI ──► migrations ──► schema-builder ─┘
  (bin/yaoi)   (runner +
                yaoi_migrations
                tracking table)
```

## Read path (`repo.find`)

1. `Repository.find(args)` (`model/Repository.ts:32`) reads `EntityMetadata` from `defaultMetadataStorage`.
2. `compileWhere` / `compileOrderBy` translate `FindArgs<T>` into `SelectQueryBuilder` calls.
3. `SelectQueryBuilder.build()` returns a plain `SelectQuery` AST (`query-builder/types/query/Query.ts:21`).
4. `Driver.query` hands the AST to `Dialect.buildQuery`, which dispatches across 11 compilers under a per-call `CompilationContext`. PostgreSQL emits positional `$N` params.
5. Rows come back as `QueryResult<TRow>`. `hydrate` rebuilds class instances via `Object.create(prototype)` — **constructors are skipped**.
6. If `include` is set, `loadIncludes` dispatches to a per-relation-kind loader; each loader does one batched `WHERE pk IN (...)` per parent set, then assigns results in-memory and recurses (depth ≤ 10).

## Write path (`repo.save` with cascades)

1. `hasCascadeChildren` short-circuits for plain payloads.
2. `buildCascadePlan` (Kahn topo-sort, `model/internal/cascade/topoSort.ts:46`) walks the entity graph following `cascade: true` edges, records FK-backfill instructions, detects cycles.
3. `walkCascade` runs the plan: backfill FK columns from already-persisted parents, then INSERT/UPDATE in topo order via `Repository`.
4. Many-to-many links are written last by `persistRelationLinks` — batched `INSERT … ON CONFLICT DO NOTHING` into the join table.

## Transactions

`transactionContext.ts` owns a single `AsyncLocalStorage<TxContext>`. `DataSource.transaction(cb)` opens a `PostgresTransactionalDriver` (a `Driver` pinned to one `pg.Client`, depth-counted for `SAVEPOINT sp_N`), wraps it in an `EntityManager`, stores the context, and runs `cb`. While the callback runs:

- `Repository.resolveDriver()` checks `ambientTxFor(ds)` at every call → ambient repos transparently join the transaction.
- `BaseModel.<static>` methods route through `ambientEntityManagerFor(ds)` → AR statics also join.
- Relation loaders bypass this and use `dataSource.getDriver()` directly — **eager-loaded reads escape the open transaction** (gotcha; documented in `docs/modules/model.md`).

## Public API (`src/index.ts`)

Exported: all of `decorators`, `metadata` (incl. `defaultMetadataStorage`), `model` (DataSource, Repository, BaseModel, EntityManager, transaction helpers, registries, all query-types), the `drivers` public surface (`PostgresDriver`, `PostgresDialect*`, `DriverFactory`, `DBType`, errors, plus type-only interfaces for the whole compiler/dialect protocol), the `schema-builder` public surface (`SchemaBuilder`, `TableBuilder`, `AlterTableBuilder`, `ColumnBuilder`, `ForeignKeyBuilder`, `DdlQueryType`, plus type-only `DdlQuery` / `ColumnSpec` / `ColumnType` / `IndexSpec` / `ForeignKeySpec`), the `migrations` public surface (`MigrationRunner`, all migration error classes, `DEFAULT_TABLE_NAME`, `DEFAULT_FILE_EXTENSIONS`, plus type-only `Migration` / `MigrationStatus` / `MigrationRunnerOptions`), and the CLI's small public footprint (`defineConfig`, `YaoiConfig`, `CliUsageError`, `ConfigNotFoundError`, `ConfigShapeError`).

**Not exported:** `query-builder`. Direct consumers must import via `@/query-builder/` — the path alias is configured in `tsconfig.json`.

## CLI surface

The published package ships an executable `yaoi` (`package.json#bin → bin/yaoi.js`). Four subcommands:

```
yaoi migrate:make <name>          # generate a new migration file (offline)
yaoi migrate:up [--to <name>]     # apply pending migrations
yaoi migrate:down [--name <name>] # roll back the most recently applied migration
yaoi migrate:status               # print the applied/pending/orphan/mismatch table
```

All four resolve `yaoi.config.ts` (then `.js` / `.cjs` / `.mjs`) from the cwd. See `docs/modules/cli.md`.

## Cross-cutting concerns

- **Global mutable singletons:** `defaultMetadataStorage` and `dataSourceRegistry` are module-level. Tests must `clear()` between runs (decorator double-registration throws `DUPLICATE_*` from `MetadataError`).
- **Lazy class targets:** every relation decorator and `RelationMetadata.resolveTarget` accept a `() => Target` thunk to break circular imports between entity files.
- **Pending metadata pattern:** field decorators stash on `context.metadata` (Symbol.metadata polyfill); `@Entity` flushes them atomically. Order between `@Column` and `@Entity` does not matter.
- **`Strict<T, A>`** narrows return types when callers pass `narrow: true` alongside `select` / `include`, mirroring the include shape at the type level.

## Tests

Spec file counts (suites) per module:

| Module | Unit (`__tests__`) | Integration (`__integration__`) |
|---|---|---|
| decorators | 4 | — |
| metadata | 1 | — |
| query-builder | 9 | — |
| schema-builder | 4 | 4 |
| drivers | 11 (`drivers` + `drivers/postgres` + DDL compilers) | 7 (under `postgres/__integration__`) |
| model | 14 | 27 |
| migrations | 4 | 4 |
| cli | 4 | 4 |

As of the current commit: 51 unit suites / 456 unit tests; 46 integration suites / 171 integration tests. Integration tests use `@testcontainers/postgresql` (see `package.json` `devDependencies`).

## Where to look next

- `docs/modules/model.md` — biggest module; covers Repository, includes, cascades, transactions in depth.
- `docs/modules/drivers.md` — compilation pipeline, connection strategies, savepoint protocol.
- `docs/modules/query-builder.md` — DML AST shapes; useful when reading drivers' compilers.
- `docs/modules/schema-builder.md` — DDL AST + Knex-fluent `createTable`/`alterTable` API.
- `docs/modules/migrations.md` — `MigrationRunner`, tracking table, checksum enforcement, advisory lock.
- `docs/modules/cli.md` — `bin/yaoi`, `yaoi.config.ts` resolution, exit codes.
- `docs/modules/decorators.md` + `docs/modules/metadata.md` — registration lifecycle.
