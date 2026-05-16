# YAOI — Yet Another ORM Implementation

> A TypeScript ORM for PostgreSQL with decorator-based entities, a two-pipeline DML/DDL architecture, and a programmatic migration runner with checksum enforcement.

<!-- test string -->


## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Entities & Decorators](#entities--decorators)
- [DataSource](#datasource)
- [Repository](#repository)
- [BaseModel (Active Record)](#basemodel-active-record)
- [Query Builder](#query-builder)
- [Schema Builder](#schema-builder)
- [Migrations](#migrations)
- [CLI](#cli)
- [Transactions](#transactions)
- [Type Utilities](#type-utilities)
- [Testing](#testing)
- [License](#license)

---

## Overview

YAOI is a TypeScript ORM for PostgreSQL built with type safety as its primary design constraint. Every query, relation, and schema operation is typed end-to-end — narrowed return types, typed `WHERE` operators, and recursive include configs mean the compiler catches mismatches before they reach the database.

### Dual API — choose what fits

YAOI does not force a single persistence pattern. Two fully-featured APIs coexist in the same project:

- **Repository pattern** — `dataSource.getRepository(Entity)` returns a typed `Repository<T>` with `find`, `findOne`, `save`, `delete`, `count`, and `upsert`. Custom repositories extend `Repository<T>` and register via the `@EntityRepository` decorator. If you prefer not to thread a `DataSource` instance through your app, `makeRepository(Entity)` resolves the same repo from the global registry.
- **Active Record** — extend `BaseModel` to get static query methods (`Entity.find(...)`, `Entity.findOne(...)`) and instance methods (`entity.save()`, `entity.delete()`, `entity.reload()`) directly on the class. Both patterns participate in the same ambient transaction automatically.

### Modular architecture

The codebase is split into eight strictly layered modules with an acyclic dependency graph:

| Layer | Modules |
|---|---|
| Leaves (no deps) | `query-builder`, `schema-builder` |
| Registry | `metadata`, `decorators` |
| Runtime | `drivers`, `model` |
| Schema evolution | `migrations`, `cli` |

DML and DDL pipelines are deliberately disjoint at the type level — the driver rejects DDL on the query path and DML on the DDL path. Each module can be used independently; the migration runner, for example, has no dependency on `model` or `decorators`.

### Migrations and CLI

A programmatic `MigrationRunner` tracks applied migrations in a `yaoi_migrations` table, enforces SHA-256 checksums on every already-applied file (drift throws before anything runs), and wraps each migration in a transactional DDL block — a failed `up()` rolls back both the schema change and the tracking row atomically. The bundled `yaoi` CLI exposes four subcommands:

```
yaoi migrate:make <name>        # generate a timestamped migration file
yaoi migrate:up [--to <name>]   # apply pending migrations
yaoi migrate:down [--name <name>] # roll back the most recently applied
yaoi migrate:status             # print applied / pending / orphan / mismatch
```

### Tested at every level

The test suite covers 51 unit suites (456 tests) and 46 integration suites (171 tests). Integration tests spin up a real PostgreSQL instance via `@testcontainers/postgresql` — no mocking the database.

## Project Structure

```
src/
├── index.ts              # package entry point — re-exports the public API
├── query-builder/        # DML AST construction (no SQL emitted)
├── schema-builder/       # DDL AST construction (no SQL emitted)
├── metadata/             # global entity/column/relation registry
├── decorators/           # @Entity, @Column, @Relation — populate the registry
├── drivers/              # compile ASTs → SQL, manage connections and transactions
├── model/                # Repository, BaseModel, includes, cascades
├── migrations/           # MigrationRunner, tracking table, checksum enforcement
└── cli/                  # bin/yaoi + yaoi.config.ts loader + migrate:* commands

bin/
├── yaoi.js               # shipped executable shim (points at dist/)
└── yaoi.ts               # in-repo dev shim (runs via ts-node, not shipped)
```

### Architecture

YAOI has two deliberately disjoint pipelines — DML (data) and DDL (schema) — that share a driver interface but are kept separate at the type level. `Driver.query` rejects DDL at compile time; `Driver.ddl` rejects DML.

```
  user code
     │  @Entity / @Column / @Relation           BaseModel.find / repo.find
     ▼                                                       │
  decorators ──registers──► metadata ◄──reads── model ◄─────┘
                                                │
                                                │ DML AST
                                                ▼
                                         query-builder
                                                │
                                                ▼
                                            drivers ──pg──► PostgreSQL
                                              ▲
                                              │ DDL AST
                                              │
  yaoi CLI ──► migrations ──► schema-builder ─┘
```

The dependency graph is strictly acyclic. `query-builder` and `schema-builder` are leaves — they depend on nothing inside the project. `model` is the read/write apex for data; `migrations` and `cli` are the schema-evolution apex and are independent of `model`.

### Module reference

---

#### `query-builder`

Pure DML AST construction. Exposes a fluent `QueryBuilder` that produces a typed `SelectQuery | InsertQuery | UpdateQuery | DeleteQuery` IR without emitting any SQL. SQL emission is the responsibility of the dialect compilers in `drivers`.

**Depends on:** nothing (leaf module)

**Not re-exported from `src/index.ts`** — consumers import directly from `@/query-builder/`.

---

#### `schema-builder`

Pure DDL AST construction, mirroring `query-builder` for schema operations. Exposes a `SchemaBuilder` facade backed by a `Driver` with a Knex-fluent `createTable` / `alterTable` / `dropTable` / `renameTable` API. Builds a `DdlQuery` IR; the driver dispatches it to the appropriate Postgres compiler.

**Depends on:** `drivers` (holds a `Driver` to dispatch compiled DDL)

**Public API:** `SchemaBuilder`, `TableBuilder`, `AlterTableBuilder`, `ColumnBuilder`, `ForeignKeyBuilder`, `DdlQueryType` + all DDL IR types

---

#### `metadata`

Global registry for entity structure. Decorators write into it; `model` reads from it at query-build time. Provides a singleton `defaultMetadataStorage` that maps entity classes to their `EntityMetadata` (columns, relations, table name, schema). The registry validates uniqueness on registration and builds metadata with prototype-chain inheritance, so base-class columns appear in all subclasses.

**Depends on:** `query-builder/types` (reuses `ColumnType` / `DefaultValue`)

**Public API:** `defaultMetadataStorage`, `DefaultMetadataStorage`, `MetadataError`, `EntityMetadata`, `ColumnMetadata`, `RelationMetadata`

---

#### `decorators`

TypeScript class and field decorators that populate `defaultMetadataStorage`. Field decorators stash metadata in a pending state on `Symbol.metadata`; `@Entity` flushes them atomically, so decorator declaration order does not matter. Relation decorators accept a lazy `() => TargetClass` thunk to break circular imports between entity files.

**Depends on:** `metadata`, `model/repositoryRegistry`

**Public API:** `@Entity`, `@Column`, `@PrimaryKey`, `@EntityRepository`, `@ManyToOne`, `@OneToMany`, `@OneToOne`, `@ManyToMany` + their option interfaces

---

#### `drivers`

Compiles DML and DDL AST nodes into wire SQL and executes them against PostgreSQL via `pg`. Owns the full lifecycle: connection management (pool or single client), query compilation, parameter binding (`$1 … $N`), and nested transaction control (`BEGIN` / `SAVEPOINT sp_N`). The compilation pipeline is: `Driver.query(ast)` → `Dialect.buildQuery(ast, ctx)` → dispatches to one of 11 specialized `QueryCompiler` implementations.

**Depends on:** `query-builder` (DML AST types), `schema-builder` (DDL AST types)

**Public API:** `DriverFactory`, `DBType`, `PostgresDriver`, `PostgresDialect`, `PostgresDialectUtils`, `PostgresParameterManager`, `DriverError`, `NotImplementedError` + type-only interfaces for the entire compiler/dialect protocol

---

#### `model`

The read/write apex. Wraps `query-builder` and `drivers` with typed CRUD operations, eager relation loading, cascade persistence, and ambient transaction propagation via `AsyncLocalStorage`. Exposes two persistence patterns: `Repository<T>` (repository pattern) and `BaseModel` (Active Record). Both transparently join any open transaction without explicit forwarding.

**Depends on:** `decorators`, `metadata`, `query-builder`, `drivers`

**Public API:**
- Classes: `DataSource`, `Repository`, `BaseModel`, `EntityManager`
- Functions: `setDataSource`, `getDataSource`, `clearDataSource`, `makeRepository`, `withRolledBackTransaction`
- Query types: `FindArgs`, `FindOneArgs`, `CountArgs`, `Where`, `WhereOperators`, `IncludeConfig`, `OrderBy`, `Strict`
- Errors: `ModelError`, `ModelErrorCode`

---

#### `migrations`

Programmatic migration runner. Discovers migration files on disk, tracks applied migrations in a `yaoi_migrations` table, enforces SHA-256 checksums on every already-applied file, and runs each `up`/`down` callback inside a transactional DDL block — a failed migration rolls back both the schema change and the tracking row atomically. Uses a PostgreSQL advisory lock to prevent concurrent runners from racing.

**Depends on:** `schema-builder`, `drivers`

**Public API:** `MigrationRunner`, `ChecksumMismatchError`, `MissingMigrationFileError`, `InvalidMigrationFileError`, `OutOfOrderRollbackError`, `MigrationNotFoundError`, `DEFAULT_TABLE_NAME`, `DEFAULT_FILE_EXTENSIONS` + `Migration`, `MigrationStatus`, `MigrationRunnerOptions` types

---

#### `cli`

A thin shell around `MigrationRunner`. Resolves `yaoi.config.ts` (or `.js` / `.cjs` / `.mjs`) from the current working directory, parses argv, and dispatches to one of four subcommands. Adds nothing to the runner's behaviour — it translates config, arguments, and errors into Unix exit codes (0 / 1 / 2 / 3).

**Depends on:** `migrations`, `drivers`

**Public API:** `defineConfig`, `YaoiConfig`, `CliUsageError`, `ConfigNotFoundError`, `ConfigShapeError`

## Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **TypeScript** >= 5.5
- **PostgreSQL** (any version supported by `pg` 8.x)

### Install the package

```bash
# npm
npm install @iriskaik/yaoi

# yarn
yarn add @iriskaik/yaoi

# pnpm
pnpm add @iriskaik/yaoi
```

### TypeScript configuration

YAOI uses **TC39 stage 3 decorators** — the standard decorator proposal, not the legacy TypeScript-specific one. The following compiler options are required:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "ESNext.Decorators"],
    "experimentalDecorators": false,
    "strictPropertyInitialization": false
  }
}
```

- `target: "ES2022"` — required for the decorator context API to be available at runtime.
- `lib: [..., "ESNext.Decorators"]` — makes TypeScript aware of the `Symbol.metadata` type. The runtime polyfill for `Symbol.metadata` is bundled inside YAOI and applied automatically — no manual setup needed.
- `experimentalDecorators: false` — opt into the standard proposal. Setting this to `true` activates the legacy syntax, which is incompatible with YAOI's decorators.
- `strictPropertyInitialization: false` — entity class properties declared with `@Column` or relation decorators have no initializer in the constructor body (they are populated by the ORM at hydration time), so strict initialization checks must be disabled.

### Peer dependencies

`ts-node` and `tsconfig-paths` are optional. They are only required if you run TypeScript migration files or a `yaoi.config.ts` config file directly (i.e. without a prior build step):

```bash
npm install --save-dev ts-node tsconfig-paths
```

If you compile everything to JavaScript before running migrations, these can be omitted.

## Configuration

YAOI has two configuration surfaces that share the same `DriverConfig` shape but serve different purposes: `DataSource` for application runtime, and `yaoi.config.ts` for the CLI and migration runner.

### Runtime — `DataSource`

Create a `DataSource` with a driver config, call `initialize()` before use, and `destroy()` on shutdown:

```ts
import { DataSource, DBType } from "@iriskaik/yaoi";

const dataSource = new DataSource({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "",
    database: process.env.PGDATABASE ?? "myapp",
  },
});

await dataSource.initialize();
```

**Repository pattern** — repos are obtained directly from the `DataSource` instance, no extra setup needed:

```ts
const userRepo = dataSource.getRepository(User);
const postRepo = dataSource.getRepository(Post);
```

**Repository via global registry (`makeRepository`)** — if you prefer the Repository pattern but want to avoid passing `dataSource` around, call `setDataSource` once and use `makeRepository` anywhere in your app:

```ts
import { setDataSource, makeRepository } from "@iriskaik/yaoi";

await dataSource.initialize();
setDataSource(dataSource);

// anywhere else, no dataSource import needed
const userRepo = makeRepository(User);
```

**Active Record (`BaseModel`)** — static methods also resolve from the global registry; the same `setDataSource` call covers both `makeRepository` and `BaseModel`:

```ts
import { setDataSource } from "@iriskaik/yaoi";

await dataSource.initialize();
setDataSource(dataSource);

// BaseModel statics and makeRepository both work from here
```

All three approaches can coexist in the same project.

---

### CLI — `yaoi.config.ts`

The `yaoi` CLI resolves a config file from the current working directory, checking `yaoi.config.ts` → `.js` → `.cjs` → `.mjs` in that order. Use `defineConfig` for type validation:

```ts
import { defineConfig, DBType } from "@iriskaik/yaoi";

export default defineConfig({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "",
    database: process.env.PGDATABASE ?? "myapp",
  },
  migrationsDir: "./migrations",
  // tableName: "yaoi_migrations",       // default
  // fileExtensions: [".ts", ".js"],     // default
});
```

`defineConfig` is the identity function — it exists solely so the editor and `tsc` can validate the shape.

Pass `--config <path>` to override the default resolution:

```bash
yaoi migrate:up --config ./config/yaoi.staging.config.ts
```

---

### `PostgresDriverConfig` options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | `DBType.POSTGRES` | yes | — | Database type discriminant |
| `host` | `string` | yes | — | PostgreSQL host |
| `port` | `number` | yes | — | PostgreSQL port |
| `user` | `string` | yes | — | Database user |
| `password` | `string` | yes | — | Database password |
| `database` | `string` | yes | — | Database name |
| `ssl` | `boolean \| object` | no | `false` | SSL config passed to `pg` |
| `pool.min` | `number` | no | `pg` default | Minimum pool connections |
| `pool.max` | `number` | no | `pg` default | Maximum pool connections |
| `mode` | `"pool" \| "client"` | no | `"pool"` | `"pool"` uses `pg.Pool`; `"client"` pins a single `pg.Client` — not suitable for concurrent workloads |

> Only `DBType.POSTGRES` is fully implemented. `DBType.MYSQL` and `DBType.SQLITE` exist as type stubs for future drivers.

---

## Entities & Decorators

Entities are plain TypeScript classes decorated with `@Entity`. Each field mapped to a database column carries `@Column` (or `@PrimaryKey`). Relation fields carry one of the four relation decorators. No base class is required — unless you want the Active Record API (see [BaseModel](#basemodel-active-record)).

### `@Entity(options?)`

Registers a class as a database entity. Must be placed on every class that should be tracked by the ORM.

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Override the table name. Defaults to the class name (e.g. `User` → `user`). |
| `schema` | `string` | Database schema (e.g. `"public"`). Omit to use the driver default. |

```ts
import { Entity } from "@iriskaik/yaoi";

@Entity({ name: "users", schema: "public" })
class User { ... }
```

### `@PrimaryKey(options?)`

Declares the primary key column. Shorthand for `@Column({ ...options, primary: true })`.

```ts
import { Entity, PrimaryKey } from "@iriskaik/yaoi";

@Entity()
class User {
  @PrimaryKey({ type: "integer", generated: "increment" })
  id: number;
}
```

### `@Column(options)`

Declares a regular (non-primary) column.

| Option | Type | Description |
|--------|------|-------------|
| `type` | `ColumnType` | Logical column type (see table below). Required unless `dbType` is set. |
| `dbType` | `string` | Raw SQL type; overrides `type` when both are given. |
| `name` | `string` | Column name in the database. Defaults to the property name. |
| `nullable` | `boolean` | Allows `NULL`. Default `false`. |
| `unique` | `boolean` | Adds a `UNIQUE` constraint. Default `false`. |
| `length` | `number` | Character length for string/text columns. |
| `precision` | `number` | Total digits for decimal columns. |
| `scale` | `number` | Decimal digits for decimal columns. |
| `default` | `DefaultValue \| ScalarParam` | Column default — pass a plain value or `{ kind: "raw", sql: "now()" }` for SQL expressions. |
| `generated` | `GeneratedStrategy` | `"increment"`, `"identity"`, or `"uuid"`. |
| `comment` | `string` | Column comment stored in the schema. |

**`ColumnType` values:** `"string"` · `"text"` · `"integer"` · `"bigint"` · `"float"` · `"decimal"` · `"boolean"` · `"date"` · `"timestamp"` · `"timestamptz"` · `"json"` · `"jsonb"` · `"uuid"`

```ts
import { Entity, PrimaryKey, Column } from "@iriskaik/yaoi";

@Entity()
class Post {
  @PrimaryKey({ type: "uuid", generated: "uuid" })
  id: string;

  @Column({ type: "string", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  body: string | null;

  @Column({ type: "timestamptz", default: { kind: "raw", sql: "now()" } })
  createdAt: Date;
}
```

### Relation decorators

All relation decorators accept a **lazy target thunk** `() => TargetClass` as their first argument. This avoids circular-import issues when two entities reference each other.

#### `@ManyToOne(() => Target, options?)`

The "many" side of a many-to-one relation. Owns the foreign key column.

| Option | Type | Description |
|--------|------|-------------|
| `joinColumn` | `JoinColumnOptions` | Override `name` (FK column) and `referencedColumnName`. |
| `inverseSide` | `keyof Target` | Property on the related entity that holds the inverse `@OneToMany`. |
| `cascade` | `boolean` | Persist related entity on save. Default `false`. |
| `nullable` | `boolean` | Allow `NULL` FK. Default `false`. |

#### `@OneToMany(() => Target, options)`

The "one" side of a one-to-many relation. Does not own a column; requires `inverseSide`.

| Option | Type | Description |
|--------|------|-------------|
| `inverseSide` | `keyof Target` | **Required.** Property on the related entity that holds the `@ManyToOne`. |
| `cascade` | `boolean` | Persist related entities on save. Default `false`. |

#### `@OneToOne(() => Target, options?)`

One-to-one relation. The side with `joinColumn` owns the FK.

| Option | Type | Description |
|--------|------|-------------|
| `joinColumn` | `JoinColumnOptions` | Present on the owning side; override FK name or referenced column. |
| `inverseSide` | `keyof Target` | Property on the related entity for the inverse side. |
| `cascade` | `boolean` | Default `false`. |
| `nullable` | `boolean` | Default `false`. |

#### `@ManyToMany(() => Target, options?)`

Many-to-many via a join table. The side with `joinTable` owns the table.

| Option | Type | Description |
|--------|------|-------------|
| `joinTable` | `JoinTableOptions` | Present on the owning side. Override `name`, `joinColumn`, and `inverseJoinColumn`. |
| `inverseSide` | `keyof Target` | Property on the related entity for the inverse side. |
| `cascade` | `boolean` | Default `false`. |

**Example — full entity with relations:**

```ts
import { Entity, PrimaryKey, Column, ManyToOne, OneToMany } from "@iriskaik/yaoi";

@Entity()
class Author {
  @PrimaryKey({ type: "integer", generated: "increment" })
  id: number;

  @Column({ type: "string", length: 100 })
  name: string;

  @OneToMany(() => Post, { inverseSide: "author" })
  posts: Post[];
}

@Entity()
class Post {
  @PrimaryKey({ type: "integer", generated: "increment" })
  id: number;

  @Column({ type: "string", length: 255 })
  title: string;

  @ManyToOne(() => Author, { inverseSide: "posts" })
  author: Author;
}
```

### `@EntityRepository(Entity)`

Registers a custom repository class for an entity. The class must extend `Repository<T>`. Once registered, `dataSource.getRepository(Entity)` and `makeRepository(Entity)` return an instance of the custom class instead of the default `Repository<T>`.

```ts
import { EntityRepository, Repository } from "@iriskaik/yaoi";

@EntityRepository(Post)
class PostRepository extends Repository<Post> {
  findPublished() {
    return this.find({ where: { published: true } });
  }
}

// dataSource.getRepository(Post) now returns a PostRepository
const repo = makeRepository(Post); // typed as PostRepository
const posts = await repo.findPublished();
```

## DataSource

`DataSource` is the runtime connection to the database. It manages a connection pool lifecycle (via the underlying driver), caches `Repository` instances per entity, and opens transactions.

### Lifecycle

```ts
import { DataSource } from "@iriskaik/yaoi";

const dataSource = new DataSource({
  driver: { dialect: "postgres", host: "localhost", port: 5432, user: "app", password: "secret", database: "mydb" },
});

await dataSource.initialize(); // opens the connection pool
// ... use the ORM ...
await dataSource.destroy();    // closes the pool; all further calls throw
```

The `DataSource` moves through three internal states: `new → connected → destroyed`. Calling `initialize()` more than once, or calling `getRepository`/`transaction` before `initialize()`, throws a `ModelError`.

| Method | Description |
|--------|-------------|
| `new DataSource(options)` | Constructs the instance. Does not open a connection. |
| `initialize(): Promise<void>` | Opens the connection pool. Must be called before any query. |
| `destroy(): Promise<void>` | Closes the pool. Safe to call multiple times. |
| `isInitialized(): boolean` | Returns `true` if in the `connected` state. |
| `getRepository<T>(Entity): Repository<T>` | Returns the repository for an entity (cached per entity class). |
| `transaction<R>(fn): Promise<R>` | Runs `fn` inside a database transaction (see [Transactions](#transactions)). |

### Global registry

For apps that use `makeRepository` or `BaseModel` static methods, register the data source once after `initialize()`:

```ts
import { setDataSource, clearDataSource } from "@iriskaik/yaoi";

await dataSource.initialize();
setDataSource(dataSource);   // makes it available globally

// tear down (e.g. in tests)
await dataSource.destroy();
clearDataSource();
```

| Function | Description |
|----------|-------------|
| `setDataSource(ds)` | Stores `ds` in the global registry. |
| `getDataSource()` | Returns the registered instance; throws `ModelError("NO_DATA_SOURCE")` if none set. |
| `clearDataSource()` | Removes the global reference (useful in tests). |

### `EntityManager`

`transaction()` passes an `EntityManager` to its callback. It wraps the in-progress transaction and exposes a scoped `getRepository` and a raw query escape hatch.

| Method | Description |
|--------|-------------|
| `getRepository<T>(Entity): Repository<T>` | Returns a transaction-bound repository for the entity. |
| `query<TRow>(sql, params?): Promise<TRow[]>` | Executes a raw parameterised SQL statement inside the transaction. |
| `raw<TRow>(sql, params?): Promise<TRow[]>` | Alias for `query`. |
| `isClosed(): boolean` | `true` once the transaction callback has returned. |

The `EntityManager` is only valid inside the `transaction()` callback. Using it after the callback returns throws a `ModelError("TRANSACTION_CLOSED")`.

## Repository

`Repository<T>` is the primary query interface for an entity. Obtain one through `DataSource`, `makeRepository`, or the transaction `EntityManager`:

```ts
const userRepo = dataSource.getRepository(User);   // explicit DataSource
const userRepo = makeRepository(User);             // global registry
const userRepo = em.getRepository(User);           // inside transaction callback
```

All read and write methods automatically join any open ambient transaction — no extra wiring required (see [Transactions](#transactions)).

### Read methods

#### `find(args?)`

Returns all matched rows as an array.

```ts
const users = await userRepo.find({
  where: { active: true },
  orderBy: [{ createdAt: "desc" }],
  take: 20,
  skip: 0,
});
```

#### `findOne(args?)`

Returns the first matched row or `null`.

```ts
const user = await userRepo.findOne({ where: { email: "a@b.com" } });
```

#### `findOneOrFail(args?)`

Like `findOne` but throws `ModelError("NOT_FOUND")` instead of returning `null`.

#### `count(args?)`

Returns the number of rows matching `where`.

```ts
const total = await userRepo.count({ where: { active: true } });
```

#### `exists(where)`

Returns `true` if at least one row matches.

```ts
const taken = await userRepo.exists({ email: "a@b.com" });
```

---

### Find args

All read methods accept a shared args object:

| Field | Type | Description |
|-------|------|-------------|
| `where` | `Where<T>` | Filter conditions (see below). |
| `orderBy` | `OrderBy<T>` | Array of `{ field: "asc" \| "desc" }` objects applied in order. |
| `take` | `number` | Max rows to return (`LIMIT`). |
| `skip` | `number` | Rows to skip (`OFFSET`). |
| `include` | `IncludeConfig<T>` | Relations to eager-load (see below). |
| `select` | `SelectMap<T>` | Columns to include in the result (see below). |
| `narrow` | `true` | Narrows the return type to reflect only the selected/included fields (see [Type narrowing](#type-narrowing)). |

#### `Where<T>` — filter conditions

A plain equality value or an operators object:

```ts
// exact match (shorthand)
{ where: { age: 30 } }

// operator object
{ where: { age: { $gte: 18 }, name: { $like: "A%" } } }

// logical combinators
{ where: { $or: [{ role: "admin" }, { role: "moderator" }] } }
{ where: { $and: [{ active: true }, { age: { $gte: 18 } }] } }
{ where: { $not: { banned: true } } }
```

| Operator | Meaning |
|----------|---------|
| `$eq` | `=` |
| `$ne` | `<>` |
| `$gt` / `$lt` | `>` / `<` |
| `$gte` / `$lte` | `>=` / `<=` |
| `$in` / `$nin` | `IN (...)` / `NOT IN (...)` |
| `$like` / `$ilike` | `LIKE` / `ILIKE` (strings only) |
| `$isNull` | `IS NULL` / `IS NOT NULL` |

Only scalar columns (not relation properties) are valid `Where` keys.

#### `include` — eager-loading relations

Pass `true` to load a relation, or a nested object to load nested relations:

```ts
const posts = await postRepo.find({
  include: {
    author: true,                      // load author
    tags: { include: { posts: true } }, // load tags + their posts
  },
});
```

#### `select` — column projection

Restrict the returned columns. Primary key columns are always included.

```ts
const users = await userRepo.find({
  select: { email: true, name: true },
});
```

#### Type narrowing

When `narrow: true` is passed alongside `select` or `include`, the return type is narrowed at compile time to reflect exactly what was fetched:

```ts
const result = await userRepo.findOne({
  select: { email: true },
  include: { posts: true },
  narrow: true,
});
// result: Pick<User, "id" | "email"> & { posts: Post[] } | null
```

Without `narrow: true` the method returns the full `T | null`, which is safe to use when the shape doesn't matter.

---

### Write methods

#### `create(data)`

Constructs an entity instance from a plain object without hitting the database. The object inherits the entity's prototype but field initializers are not run (same hydration behaviour as `find`).

```ts
const user = userRepo.create({ name: "Alice", email: "alice@example.com" });
```

#### `insert(data)`

Inserts a new row and returns the persisted entity (with DB-generated values populated). Cascades relations if `cascade: true` is set on any relation field.

```ts
const user = await userRepo.insert({ name: "Alice", email: "alice@example.com" });
```

#### `save(entity)`

Upserts by primary key: inserts if no PK value is present, updates otherwise. Mutates the passed object in-place with the latest DB values. Handles cascades.

```ts
user.name = "Bob";
await userRepo.save(user); // issues UPDATE, refreshes user in-place
```

#### `update(where, patch)`

Issues a bulk `UPDATE` matching `where`. Returns the number of affected rows.

```ts
const affected = await userRepo.update({ active: false }, { deletedAt: new Date() });
```

#### `delete(where)` / `deleteMany(where)`

Issues a `DELETE` matching `where`. Both are identical; `deleteMany` is an alias. Returns the number of deleted rows.

```ts
await userRepo.delete({ id: 42 });
```

---

### Bulk methods

#### `insertMany(rows)`

Inserts multiple rows in a single query. Returns the array of persisted entities.

```ts
const posts = await postRepo.insertMany([
  { title: "Hello" },
  { title: "World" },
]);
```

#### `saveMany(entities)`

Saves multiple entities inside an implicit transaction. Each entity is inserted or updated by the same PK logic as `save`. Handles cascades.

```ts
await userRepo.saveMany([alice, bob, carol]);
```

#### `upsert(data, conflictKeys, options?)`

Inserts a row, updating on conflict. The conflict column(s) must be present in `data`.

```ts
const tag = await tagRepo.upsert(
  { slug: "typescript", label: "TypeScript" },
  ["slug"],
);
```

The `options.update` field controls which columns are updated on conflict:

| Value | Behaviour |
|-------|-----------|
| `"all-non-conflict"` (default) | Update every column that is not a conflict key. |
| `"do-nothing"` | `ON CONFLICT DO NOTHING` — re-queries by conflict keys and returns the existing row. |
| `string[]` | Update only the named columns. |

---

### Loading relations lazily

`loadRelation(entity, relationName)` fetches a single relation for an already-hydrated entity and attaches it in-place:

```ts
const post = await postRepo.findOne({ where: { id: 1 } });
await postRepo.loadRelation(post, "author"); // post.author is now populated
```

---

### Escape hatches

#### `query<TRow>(sql, params?)`

Executes a raw parameterised SQL statement through the repository's driver (respects ambient transactions).

```ts
const rows = await userRepo.query<{ count: string }>(
  "SELECT COUNT(*) AS count FROM users WHERE active = $1",
  [true],
);
```

#### `qb(alias?)`

Returns a `SelectQueryBuilder` pre-configured for the entity's table, giving full access to the query builder API (see [Query Builder](#query-builder)).

```ts
const qb = userRepo.qb("u");
qb.where((b) => b.eq({ name: "u", column: "role" }, "admin"));
const result = await userRepo.query(...qb.build());
```

---

### Custom repositories

Extend `Repository<T>` and register the class with `@EntityRepository` to add domain-specific methods. All base methods remain available.

```ts
import { EntityRepository, Repository } from "@iriskaik/yaoi";

@EntityRepository(User)
class UserRepository extends Repository<User> {
  findActive() {
    return this.find({ where: { active: true } });
  }

  async findByEmail(email: string) {
    return this.findOne({ where: { email } });
  }
}

const repo = makeRepository(User); // typed as UserRepository
const activeUsers = await repo.findActive();
```

## BaseModel (Active Record)

`BaseModel` is an optional base class that bakes the Repository API directly onto every entity class and instance. It is the Active Record pattern: the entity knows how to persist itself.

### Setup

Extend `BaseModel` and apply `@Entity` as normal. No other change is required to the decorator setup.

```ts
import { Entity, PrimaryKey, Column, BaseModel } from "@iriskaik/yaoi";

@Entity()
class User extends BaseModel {
  @PrimaryKey({ type: "integer", generated: "increment" })
  id: number;

  @Column({ type: "string", length: 100 })
  name: string;

  @Column({ type: "string", length: 255, unique: true })
  email: string;
}
```

`BaseModel` statics resolve the `DataSource` from the global registry, so `setDataSource` must be called before any static method is used:

```ts
await dataSource.initialize();
setDataSource(dataSource);
```

To pin a specific `DataSource` to one entity class (useful in tests or multi-tenant setups), call `useDataSource` before any queries:

```ts
User.useDataSource(testDataSource);
```

`useDataSource` walks the prototype chain, so a call on a parent class applies to all subclasses that have not overridden it.

---

### Static methods

All static methods accept the same args as the corresponding `Repository` methods, including `where`, `orderBy`, `take`, `skip`, `include`, `select`, and `narrow`.

| Method | Description |
|--------|-------------|
| `Entity.find(args?)` | Returns all matched rows. |
| `Entity.findOne(args?)` | Returns the first matched row or `null`. |
| `Entity.findOneOrFail(args?)` | Like `findOne` but throws `ModelError("NOT_FOUND")` if nothing matched. |
| `Entity.count(args?)` | Returns the row count matching `where`. |
| `Entity.exists(where)` | Returns `true` if at least one row matches. |
| `Entity.create(data)` | Constructs an in-memory instance without a DB call. |
| `Entity.insert(data)` | Inserts a single row, returns the persisted entity. |
| `Entity.insertMany(rows)` | Bulk-inserts rows in one query. |
| `Entity.saveMany(entities)` | Saves multiple entities inside an implicit transaction. |
| `Entity.deleteMany(where)` | Deletes all rows matching `where`, returns the affected count. |
| `Entity.upsert(data, conflictKeys, options?)` | Insert-or-update on conflict. |
| `Entity.useDataSource(ds)` | Pins a specific `DataSource` to this class. |

```ts
const users = await User.find({ where: { active: true }, orderBy: [{ name: "asc" }] });
const alice = await User.findOne({ where: { email: "alice@example.com" } });
const count  = await User.count({ where: { active: false } });
await User.deleteMany({ active: false });
```

---

### Instance methods

| Method | Description |
|--------|-------------|
| `instance.save()` | Upserts the instance by PK (insert if no PK, update otherwise). Mutates in-place, returns `this`. |
| `instance.delete()` | Deletes the row identified by the instance's PK. |
| `instance.reload()` | Re-fetches the row by PK and merges the latest values into the instance. Returns `this`. |
| `instance.loadRelation(key)` | Eager-loads a single relation and attaches it to the instance. Returns the relation value. |

```ts
const user = await User.findOneOrFail({ where: { id: 1 } });
user.name = "Bob";
await user.save();    // UPDATE users SET name = 'Bob' WHERE id = 1

await user.reload();  // re-fetches from DB, merges into user

await user.loadRelation("posts"); // user.posts is now populated

await user.delete();  // DELETE FROM users WHERE id = 1
```

---

### Transactions

`BaseModel` statics and instance methods transparently join any open ambient transaction — no extra configuration needed. See [Transactions](#transactions) for details.

## Query Builder

The query builder is a **pure AST construction layer**. It builds a typed `Query` object from a fluent API without emitting any SQL — SQL generation is done downstream by the driver's dialect compiler. The query builder has no dependencies on the driver, metadata, or model layers.

> **Import note:** The query builder is not re-exported from the package root. It is accessed either through `Repository.qb()` (most common) or imported directly from `@iriskaik/yaoi/query-builder` for advanced use.

### Entry point: `QueryBuilder`

`QueryBuilder` is the factory for all four builder types:

```ts
import { QueryBuilder } from "@iriskaik/yaoi/query-builder";

const qb = new QueryBuilder();
const select = qb.select({ name: "users" });
const insert = qb.insert({ name: "users" });
const update = qb.update({ name: "users" });
const del    = qb.delete({ name: "users" });
```

Each builder method returns its respective builder instance. Calling `.build()` on any builder produces the `Query` AST.

The most common entry point for end users is `Repository.qb()`, which returns a `SelectQueryBuilder` pre-configured for the entity's table:

```ts
@EntityRepository(User)
class UserRepository extends Repository<User> {
  async findAdmins() {
    const qb = this.qb("u");
    qb.where((b) => b.whereIn({ name: "role", table: "u" }, ["admin", "superadmin"]));
    const [{ sql, params }] = [this.resolveDriver()]; // protected — available in subclasses
    return this.resolveDriver()
      .query<User>(qb.build())
      .then((r) => r.rows);
  }
}
```

---

### `SelectQueryBuilder`

The richest builder. All methods return `this` for chaining.

#### Column selection

| Method | Description |
|--------|-------------|
| `select(...columns)` | Set the columns to select. Each column is a `ColumnDescription` (`{ name, table?, alias? }`). |
| `selectRaw(sql, params?)` | Append a raw SQL expression to the SELECT list. |
| `distinct(enabled?)` | Add `DISTINCT`. Default `true`. |

#### WHERE

All `where*` methods accept either a **callback** (receives a `ConditionBuilder`) or a direct column/operator/value triple.

| Method | Description |
|--------|-------------|
| `where(cb)` / `where(col, op, val)` | Add the first (or only) condition. |
| `andWhere(col, op, val)` | Append with `AND`. |
| `orWhere(col, op, val)` | Append with `OR`. |

**`ConditionBuilder` convenience methods** (available inside the callback):

| Method | Description |
|--------|-------------|
| `whereIn(col, values)` / `orWhereIn` / `whereNotIn` / `orWhereNotIn` | `IN` / `NOT IN` |
| `whereLike(col, pattern)` / `orWhereLike` / `whereNotLike` | `LIKE` / `NOT LIKE` |
| `whereILike(col, pattern)` / `orWhereILike` / `whereNotILike` | `ILIKE` / `NOT ILIKE` |
| `whereBetween(col, min, max)` / `orWhereBetween` / `whereNotBetween` / `orWhereNotBetween` | `BETWEEN` / `NOT BETWEEN` |
| `whereNull(col)` / `orWhereNull` / `whereNotNull` / `orWhereNotNull` | `IS NULL` / `IS NOT NULL` |
| `whereRaw(sql, params?)` / `orWhereRaw` | Raw SQL condition. |
| `group(connector, cb)` | Nested condition group wrapped in parentheses. |
| `whereNot(col, op, val)` / `orWhereNot` | Negate with `AND NOT` / `OR NOT`. |

**`ComparisonOperator` values:** `=` · `<>` · `>` · `<` · `>=` · `<=` · `IN` · `NOT IN` · `LIKE` · `NOT LIKE` · `ILIKE` · `NOT ILIKE` · `BETWEEN` · `NOT BETWEEN` · `IS NULL` · `IS NOT NULL`

#### JOINs

| Method | Description |
|--------|-------------|
| `join(table, onCb)` | `INNER JOIN` |
| `leftJoin(table, onCb)` | `LEFT JOIN` |
| `rightJoin(table, onCb)` | `RIGHT JOIN` |
| `fullJoin(table, onCb)` | `FULL JOIN` |
| `crossJoin(table)` | `CROSS JOIN` (no ON clause) |

The `onCb` callback receives a `ConditionBuilder` for building the join condition.

#### Aggregation

| Method | Description |
|--------|-------------|
| `groupBy(...columns)` | `GROUP BY` the given columns. |
| `having(cb)` / `having(col, op, val)` | `HAVING` clause. Requires `groupBy` — throws `QueryBuilderError` otherwise. |

#### Ordering and pagination

| Method | Description |
|--------|-------------|
| `orderBy(col, direction?)` | `ORDER BY`. Direction: `OrderDirection.ASC` (default) or `OrderDirection.DESC`. |
| `limit(n)` | `LIMIT n`. |
| `offset(n)` | `OFFSET n`. Requires `limit` — throws `QueryBuilderError` otherwise. |

#### Set operations and returning

| Method | Description |
|--------|-------------|
| `union(query, all?)` | `UNION` with another `SelectQuery` or `SelectQueryBuilder`. |
| `unionAll(query)` | `UNION ALL`. |
| `returning(...columns)` | `RETURNING` clause. |

---

### `InsertQueryBuilder`

| Method | Description |
|--------|-------------|
| `values(record)` | Add a single row (`{ columnName: value }`). |
| `valuesList(records)` | Add one or more rows at once. |
| `returning(...columns)` | `RETURNING` clause. |
| `onConflict(clause)` | Attach an `ON CONFLICT` clause for upsert semantics. `targetColumns` must be non-empty or throws `QueryBuilderError`. |

`build()` throws `QueryBuilderError` if no values were added.

---

### `UpdateQueryBuilder`

| Method | Description |
|--------|-------------|
| `set(values)` | Merge column/value pairs into the `SET` clause. |
| `where(cb \| col, op, val)` | Filter rows to update. |
| `orderBy(col, direction?)` | `ORDER BY`. |
| `limit(n)` | `LIMIT`. |
| `returning(...columns)` | `RETURNING`. |
| `onWarning(cb)` | Register a callback that receives a `QueryBuilderWarning` if `build()` is called with no WHERE clause. |

`build()` throws `QueryBuilderError` if `set()` was never called.

---

### `DeleteQueryBuilder`

| Method | Description |
|--------|-------------|
| `where(cb \| col, op, val)` | Filter rows to delete. |
| `orderBy(col, direction?)` | `ORDER BY`. |
| `limit(n)` | `LIMIT`. |
| `returning(...columns)` | `RETURNING`. |
| `onWarning(cb)` | Same as `UpdateQueryBuilder` — fires if no WHERE clause. |

---

### Errors

| Class | When thrown |
|-------|-------------|
| `QueryBuilderError` | Invalid builder state at `build()` time (missing `groupBy` before `having`, missing `limit` before `offset`, empty INSERT values, empty `onConflict.targetColumns`). |
| `QueryBuilderWarning` | **Not thrown.** Delivered to the `onWarning` callback when UPDATE or DELETE is built without a WHERE clause. Silently dropped if no callback is registered. |

## Schema Builder

The schema builder provides fluent API for DDL operations — `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `RENAME TABLE`. It is a pure AST layer: every method call assembles an IR object (`DdlQuery`) that is dispatched to the Postgres DDL compiler only when the async `SchemaBuilder` method resolves. No SQL is emitted during the callback.

> The DML pipeline (`Driver.query`) and the DDL pipeline (`Driver.ddl`) are type-disjoint: passing a `DdlQuery` to `query()` or a `SelectQuery` to `ddl()` is a compile-time error.

Obtain a `SchemaBuilder` from an initialized `DataSource`:

```ts
const schema = new SchemaBuilder(dataSource.getDriver());
```

### `createTable`

```ts
await schema.createTable("users", (t) => {
  t.id();                                              // SERIAL PRIMARY KEY NOT NULL
  t.string("email", 255).notNull().unique();
  t.text("bio").nullable();
  t.boolean("active").notNull().default(true);
  t.timestamp("created_at", { withTimezone: true }).notNull().defaultRaw("NOW()");
  t.timestamp("updated_at", { withTimezone: true }).notNull().defaultRaw("NOW()");

  t.index(["email"], { unique: true, name: "users_email_uidx" });
  t.foreign("role_id").references("roles", "id").onDelete("cascade");
});
```

Pass `t.ifNotExists()` before the callback to emit `CREATE TABLE IF NOT EXISTS`.

#### Column type methods

| Method | SQL type |
|---|---|
| `t.id(name?)` | `SERIAL PRIMARY KEY NOT NULL` |
| `t.bigId(name?)` | `BIGSERIAL PRIMARY KEY NOT NULL` |
| `t.string(name, length?)` | `VARCHAR(n)` |
| `t.text(name)` | `TEXT` |
| `t.integer(name)` | `INTEGER` |
| `t.bigint(name)` | `BIGINT` |
| `t.smallint(name)` | `SMALLINT` |
| `t.boolean(name)` | `BOOLEAN` |
| `t.decimal(name, precision?, scale?)` | `DECIMAL(p, s)` |
| `t.timestamp(name, opts?)` | `TIMESTAMP [WITH TIME ZONE]` |
| `t.date(name)` | `DATE` |
| `t.time(name)` | `TIME` |
| `t.json(name)` | `JSON` |
| `t.jsonb(name)` | `JSONB` |
| `t.uuid(name)` | `UUID` |
| `t.raw(name, sql)` | raw SQL type fragment |
| `t.timestamps()` | adds `created_at` + `updated_at` as `TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()` |

#### `ColumnBuilder` chainable modifiers

```ts
t.string("slug").notNull().unique().default("untitled")
t.timestamp("expires_at").nullable().defaultRaw("NOW() + INTERVAL '30 days'")
t.integer("owner_id").notNull().references("users", "id").onDelete("cascade").onUpdate("restrict")
```

| Method | Effect |
|---|---|
| `.notNull()` | adds `NOT NULL` |
| `.nullable()` | removes `NOT NULL` (default) |
| `.unique()` | column-level `UNIQUE` |
| `.primary()` | column-level `PRIMARY KEY` |
| `.default(value)` | literal default (parameter-bound) |
| `.defaultRaw(sql)` | raw SQL expression (e.g. `NOW()`) |
| `.references(table, column?)` | inline `REFERENCES table(column)` |
| `.onDelete(action)` | referential action on delete |
| `.onUpdate(action)` | referential action on update |

`ReferentialAction` values: `"cascade"`, `"set-null"`, `"restrict"`, `"no-action"`, `"set-default"`.

#### Table-level constraints

```ts
await schema.createTable("order_items", (t) => {
  t.integer("order_id").notNull();
  t.integer("product_id").notNull();
  t.primary(["order_id", "product_id"]);                            // composite PK
  t.unique(["order_id", "product_id"], { name: "oi_unique" });      // named UNIQUE
  t.index(["product_id"], { name: "oi_product_idx" });              // plain index
  t.foreign(["order_id"]).references("orders", "id").onDelete("cascade");
});
```

### `alterTable`

All operations added inside the callback are collected into a single `ALTER TABLE` statement (one multi-clause SQL). If the callback adds nothing, the call is a no-op.

```ts
await schema.alterTable("users", (t) => {
  t.addColumn("verified_at", { kind: "timestamp", withTimezone: true }).nullable();
  t.dropColumn("legacy_flag", { ifExists: true });
  t.renameColumn("bio", "about");
  t.alterColumn("email", (c) => {
    c.setNotNull(true);
    c.setType({ kind: "varchar", length: 320 });
  });
  t.addIndex(["email"], { unique: true });
  t.dropIndex("users_old_idx");
  t.addForeignKey({
    columns: ["team_id"],
    references: { table: "teams", columns: ["id"] },
    onDelete: "set-null",
  });
  t.dropConstraint("users_old_fk");
});
```

#### `AlterColumnBuilder` methods

| Method | Effect |
|---|---|
| `.setNotNull(bool)` | set or remove `NOT NULL` |
| `.setType(ColumnType)` | change column type |
| `.setDefault(value)` | set literal default |
| `.setDefaultRaw(sql)` | set raw SQL default |
| `.dropDefault()` | remove default |

> To drop and re-add the same column in separate statements, call `alterTable` twice — all operations in one callback become a single SQL statement.

### `dropTable` / `renameTable`

```ts
await schema.dropTable("legacy_sessions", { ifExists: true, cascade: true });
await schema.renameTable("users", "accounts");
```

### `hasTable`

```ts
if (!(await schema.hasTable("migrations"))) {
  await schema.createTable("migrations", (t) => { /* … */ });
}
```

Uses `information_schema.tables` scoped to `current_schema()`. Cross-schema tables are not visible.

### `raw`

```ts
await schema.raw("CREATE EXTENSION IF NOT EXISTS pgcrypto");
```

`SchemaBuilder.raw` discards the result rows — it is for side-effecting DDL only. For `SELECT` introspection use `driver.raw<TRow>` directly.

## Migrations

Migrations are plain TypeScript files that export an object with `up` and `down` methods. Each receives a `SchemaBuilder` (the same API described above) and returns `Promise<void>`. The `MigrationRunner` discovers files on disk, tracks which have been applied in a `yaoi_migrations` table, enforces SHA-256 checksums on every already-applied file, and wraps each step in a transactional DDL block — a failed `up()` rolls back both the schema change and the tracking row atomically.

### Migration file format

```ts
// migrations/20240101_000001_create_users.ts
import type { Migration } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema) {
    await schema.createTable("users", (t) => {
      t.id();
      t.string("email", 255).notNull().unique();
      t.boolean("active").notNull().default(true);
      t.timestamps();
    });
  },

  async down(schema) {
    await schema.dropTable("users", { ifExists: true });
  },
};

export default migration;
```

Files are discovered lexicographically — use a timestamp or zero-padded sequence prefix so the sort order matches the intended apply order.

### `MigrationRunner`

```ts
import { MigrationRunner } from "@iriskaik/yaoi";

const runner = new MigrationRunner({
  driver: dataSource.getDriver(),
  migrationsDir: path.join(__dirname, "migrations"),
  // tableName?: string        (default: "yaoi_migrations")
  // fileExtensions?: string[] (default: [".ts", ".js"])
});
```

#### `runner.up(opts?)`

```ts
const { applied } = await runner.up();         // apply all pending
const { applied } = await runner.up({ to: "20240101_000003_add_roles" }); // stop at (inclusive)
```

Returns `{ applied: string[] }` — only the names applied by *this* call. Returns `{ applied: [] }` when `to` points to an already-applied migration (no-op, not an error).

Throws before applying anything if any already-applied file has drifted from its stored checksum (`ChecksumMismatchError`) or has been deleted (`MissingMigrationFileError`).

#### `runner.down(opts?)`

```ts
const { rolledBack } = await runner.down();              // roll back most recently applied
const { rolledBack } = await runner.down({ name: "20240101_000003_add_roles" });
```

Only the most recently applied migration can be rolled back. Specifying a `name` that is not the most-recent throws `OutOfOrderRollbackError`. Returns `{ rolledBack: null }` when the applied set is empty.

#### `runner.status()`

```ts
const statuses = await runner.status();
// [
//   { name, applied, appliedAt, storedChecksum, fileChecksum, mismatch }
// ]
```

Read-only. Never throws on checksum drift — exposes a `mismatch: true` flag instead. Also reports orphan entries (tracking row exists, file deleted — `fileChecksum: null`).

### Tracking table schema

`yaoi_migrations` is created automatically on first `up()`, `down()`, or `status()` call:

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL` | primary key |
| `name` | `TEXT NOT NULL UNIQUE` | filename without extension |
| `checksum` | `TEXT NOT NULL` | SHA-256 hex of raw file bytes |
| `applied_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | apply timestamp |

### Error types

| Error | When thrown |
|---|---|
| `ChecksumMismatchError` | applied file content has changed since it was recorded |
| `MissingMigrationFileError` | tracking row exists but the file is gone |
| `InvalidMigrationFileError` | migration file does not export a valid `{ up, down }` shape |
| `OutOfOrderRollbackError` | `down({ name })` targets a non-most-recent migration |
| `MigrationNotFoundError` | `up({ to })` names a file that does not exist on disk |

All error classes expose a `name` string field for cross-module `instanceof`-free identification.

### Concurrency safety

The runner acquires a Postgres advisory lock (`pg_advisory_xact_lock`) keyed to `0x59414f49` (ASCII `"YAOI"`) inside every `bootstrap`, `up`, and `down` transaction. Two concurrent runners against the same database serialise at the lock — they don't race or double-apply. Inside the lock, `up()` re-reads the applied set and skips a migration if another runner applied it first, so `{ applied }` reflects only what *this* runner actually did.

### Checksum mode note

Checksums are SHA-256 over raw source bytes. Switching a project from `ts-node` execution (`.ts` source) to compiled output (`.js`) will invalidate every stored checksum. Commit to one mode before applying the first migration.

## CLI

The `yaoi` CLI is a thin shell around `MigrationRunner`. It resolves `yaoi.config.ts` from the current working directory, parses argv, and dispatches to one of four subcommands. It adds no behaviour of its own — everything under the hood is the same programmatic runner described above.

### Config file

Create `yaoi.config.ts` (or `.js` / `.cjs` / `.mjs`) at the project root:

```ts
// yaoi.config.ts
import { defineConfig, DBType } from "@iriskaik/yaoi";

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
  // tableName?: string        (default: "yaoi_migrations")
  // fileExtensions?: string[] (default: [".ts", ".js"])
});
```

`defineConfig` is the identity function — it exists only so the editor and `tsc` can validate the shape against `YaoiConfig`.

A relative `migrationsDir` is resolved relative to the config file's directory, not the shell's cwd, so the path works regardless of where you invoke `yaoi`.

### Commands

#### `migrate:make <name>`

```
yaoi migrate:make create_users
# → migrations/20240101_120000_create_users.ts
```

Creates a timestamped stub in `migrationsDir`. The directory is created if it does not exist. Non-alphanumeric characters in `name` are collapsed to underscores and the result is truncated to 60 characters. Refuses to overwrite an existing file.

This command is **offline** — it never opens a database connection. Config driver fields are not validated until the next `migrate:up`.

Generated stub:

```ts
import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(_schema: SchemaBuilder): Promise<void> {
    // TODO: implement
  },
  async down(_schema: SchemaBuilder): Promise<void> {
    // TODO: implement
  },
};

export default migration;
```

#### `migrate:up [--to <name>]`

```
yaoi migrate:up                              # apply all pending
yaoi migrate:up --to 20240101_120000_create_users  # apply up to and including this one
```

Logs `Applied: <name>` to stderr per migration and a summary on completion. Prints `No pending migrations.` when there is nothing to do.

Aborts (exit 1) before applying anything if any already-applied file has drifted from its stored checksum.

#### `migrate:down [--name <name>]`

```
yaoi migrate:down                          # roll back the most recently applied
yaoi migrate:down --name 20240101_120000_create_users
```

Only the most-recently-applied migration can be rolled back. If `--name` is given but does not match the most recent, the command exits 1 with `OutOfOrderRollbackError`. Logs `Rolled back: <name>` or `Nothing to roll back.`.

#### `migrate:status`

```
yaoi migrate:status
```

Prints an aligned table to stdout. Always exits 0 — checksum drift is shown as a `mismatch` flag in the table, not an error:

```
NAME                                    APPLIED   APPLIED AT            MISMATCH
20240101_000001_create_users            yes       2024-01-01 12:00:00   no
20240101_000002_add_roles               yes       2024-01-01 12:01:00   YES ⚠
20240101_000003_add_permissions         no        —                     —
```

### Passing a custom config path

```
yaoi --config path/to/other.config.ts migrate:up
```

`--config` is accepted before or after the subcommand.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | success |
| `1` | runtime error (migration failure, checksum mismatch, DB unreachable) |
| `2` | usage error (unknown command, missing required flag value) |
| `3` | config error (config file not found, invalid shape) |

### In-repo dev vs. built binary

The installed package ships `bin/yaoi.js` which requires the compiled `dist/`. For development inside the repo without a build step, use:

```
npm run cli -- migrate:up
```

This runs via `ts-node` with path aliases resolved, equivalent to the shipped binary.

## Transactions

### `dataSource.transaction(fn)`

Wraps a callback in a single `BEGIN` / `COMMIT` block. If the callback throws, the driver issues `ROLLBACK` and re-throws. The callback receives an `EntityManager` that is scoped to the open transaction — repositories obtained from it send all queries over the same pinned connection.

```ts
const result = await dataSource.transaction(async (em) => {
  const userRepo = em.getRepository(User);
  const orderRepo = em.getRepository(Order);

  const user = await userRepo.findOneOrFail({ where: { id: userId } });
  const order = await orderRepo.create({ userId: user.id, total: 99.99 });

  return order;
});
```

The `EntityManager` exposes:

| Method | Description |
|---|---|
| `em.getRepository(Entity)` | returns a `Repository<T>` pinned to the transaction |
| `em.query<TRow>(sql, params?)` | raw SQL query inside the transaction |
| `em.raw<TRow>(sql, params?)` | alias for `query` |
| `em.isClosed()` | true after the callback has returned |

Using `em` after the callback has returned throws `ModelError("TRANSACTION_CLOSED")`.

### Ambient transaction propagation

Transactions propagate automatically via `AsyncLocalStorage`. Any `Repository` method called inside a `transaction` callback — even one obtained earlier from `dataSource.getRepository()` — routes its queries through the active transaction's pinned connection without any explicit wiring.

```ts
// userRepo was obtained outside the transaction
const userRepo = dataSource.getRepository(User);

await dataSource.transaction(async (em) => {
  // this call goes through the transaction's connection automatically
  await userRepo.update({ id: 1 }, { active: false });

  // so does this one obtained from em
  const orderRepo = em.getRepository(Order);
  await orderRepo.delete({ userId: 1 });
});
```

Ambient propagation is scoped to the `DataSource` instance — a repo bound to a different `DataSource` is not affected.

### Nested transactions (savepoints)

Calling `dataSource.transaction()` inside an already-open transaction degrades to a `SAVEPOINT` block rather than a nested `BEGIN`. A rollback inside the inner callback issues `ROLLBACK TO SAVEPOINT` (undoing only the inner work) and then re-throws so the outer transaction can decide whether to commit or roll back further.

```ts
await dataSource.transaction(async (em) => {
  await em.getRepository(User).create({ email: "a@example.com" });

  try {
    await dataSource.transaction(async (inner) => {
      await inner.getRepository(User).create({ email: "b@example.com" });
      throw new Error("inner failure");  // → ROLLBACK TO SAVEPOINT sp_1
    });
  } catch {
    // outer transaction is still open; "a@example.com" survives
  }

  // commits "a@example.com" only
});
```

Savepoints are named `sp_1`, `sp_2`, … by nesting depth. There is no depth limit.

### `withRolledBackTransaction` (testing utility)

Opens a transaction, runs the callback, then unconditionally rolls it back. Useful for writing integration tests that insert real rows without leaving side effects in the database.

```ts
import { withRolledBackTransaction } from "@iriskaik/yaoi";

it("counts users after insert", async () => {
  await withRolledBackTransaction(dataSource, async (em) => {
    const repo = em.getRepository(User);
    await repo.create({ email: "test@example.com" });
    expect(await repo.count()).toBe(1);
  });
  // row is gone — rolled back
});
```

`withRolledBackTransaction` swallows the internal rollback sentinel and re-throws any other error that the callback raises.

## Type Utilities

YAOI ships a suite of mapped and conditional types that make repository arguments — filters, ordering, projection, eager-loading — fully type-checked without any codegen step.

### Key-classification types

Three types partition an entity's keys before any argument type is built:

| Type | Definition | What it selects |
|---|---|---|
| `RelationKeys<T>` | keys whose `NonNullable<T[K]>` extends `Relation<unknown>` | relation fields only |
| `ColumnKeys<T>` | non-method keys minus `RelationKeys<T>` | scalar / primitive columns |
| `ScalarKeys<T>` | `ColumnKeys<T>` narrowed to values extending `ScalarParam` | filterable / sortable columns |

`Relation<T>` is a phantom brand type (`T & { [RELATION_BRAND]: T }` with a `unique symbol`) applied to every relation field by the relation decorators. This lets `RelationKeys` discriminate relations from scalars purely at compile time — no runtime overhead.

```ts
// given
@Entity() class Post {
  @PrimaryKey() id!: number;
  @Column() title!: string;
  @ManyToOne(() => User) author!: Relation<User>;
}

// inferred:
//   RelationKeys<Post>  →  "author"
//   ColumnKeys<Post>    →  "id" | "title"
//   ScalarKeys<Post>    →  "id" | "title"
```

### `Where<T>` and `WhereOperators<V>`

`Where<T>` is a partial record over `ScalarKeys<T>`. Each field accepts either a plain value (implicit `$eq`) or a `WhereOperators<V>` object:

```ts
type WhereOperators<V> = {
  $eq?: V;   $ne?: V;
  $gt?: V;   $lt?: V;   $gte?: V;  $lte?: V;
  $in?: ReadonlyArray<V>;   $nin?: ReadonlyArray<V>;
  $like?: V extends string ? string : never;
  $ilike?: V extends string ? string : never;
  $isNull?: boolean;
};
```

Top-level logical combinators are supported as well:

```ts
// all three are Where<Post>
const a: Where<Post> = { title: "Hello" };
const b: Where<Post> = { id: { $in: [1, 2, 3] } };
const c: Where<Post> = { $or: [{ title: { $ilike: "%orm%" } }, { id: { $gt: 10 } }] };

// compile error — "author" is a relation, not a scalar key
const bad: Where<Post> = { author: { $eq: someUser } }; // TS error ✗
```

`$and`, `$or`, and `$not` all accept `ReadonlyArray<Where<T>>` or `Where<T>` respectively, so conditions nest to arbitrary depth.

### `OrderBy<T>` and `SortDirection`

```ts
type SortDirection = "asc" | "desc";
type OrderBy<T> = ReadonlyArray<{ [K in ScalarKeys<T>]?: SortDirection }>;
```

Each element of the array is a sort term. Multiple elements are applied in order (primary sort → secondary sort → …):

```ts
const order: OrderBy<Post> = [{ title: "asc" }, { id: "desc" }];
```

### `SelectMap<T>`

Column projection is a partial record over `ColumnKeys<T>` with values `true`:

```ts
type SelectMap<T> = { [K in ColumnKeys<T>]?: true };

const sel: SelectMap<Post> = { id: true, title: true };
// compile error — "author" is not a ColumnKey
const bad: SelectMap<Post> = { author: true }; // TS error ✗
```

### `IncludeConfig<T>` and `RelationTarget<R>`

`IncludeConfig<T>` specifies which relations to eager-load. It is self-referential — each relation key can carry its own nested `IncludeConfig`:

```ts
type IncludeConfig<T> = {
  [K in RelationKeys<T>]?:
    | true
    | { include?: IncludeConfig<RelationTarget<T[K]>> };
};
```

`RelationTarget<R>` unwraps the entity type out of a relation field, handling the brand, arrays, and optionals:

```ts
// Relation<User>              → User
// Relation<User[]>            → User
// Relation<Post | undefined>  → Post
```

```ts
const inc: IncludeConfig<Post> = {
  author: {
    include: { posts: true },   // nested IncludeConfig<User>
  },
};
```

### `Strict<T, A>` — narrowed return types

When `find` / `findOne` receive `select` or `include`, the return type narrows from the full entity to exactly what was requested. `Strict<T, A>` encodes this:

```ts
// no args → Omit<Post, RelationKeys<Post>> (relations stripped, not loaded)
const posts = await postRepo.find();            // Post without .author

// with select → Pick of selected columns only
const slim = await postRepo.find({ select: { id: true, title: true } });
// slim[0].id  ✓   slim[0].title  ✓   slim[0].author  ✗ (TS error)

// with include → relations present on the narrowed type
const full = await postRepo.find({ include: { author: true } });
// full[0].author  ✓ (type: User, not Relation<User>)
```

Nesting works recursively — `include: { author: { include: { posts: true } } }` adds `posts: Post[]` to the `author` type.

### `FindArgs<T>` / `FindOneArgs<T>` / `CountArgs<T>`

The full argument types accepted by repository read methods:

```ts
interface FindArgs<T> {
  where?:   Where<T>;
  orderBy?: OrderBy<T>;
  take?:    number;     // LIMIT
  skip?:    number;     // OFFSET
  include?: IncludeConfig<T>;
  select?:  SelectMap<T>;
  narrow?:  true;
}

type FindOneArgs<T> = FindArgs<T>;

interface CountArgs<T> {
  where?: Where<T>;
}
```

`narrow: true` is a flag that instructs the repository to return `Strict<T, FindArgs<T>>` instead of the plain entity — opt-in when you need the narrowed type in a context where TypeScript cannot infer it automatically.

## Testing

YAOI ships two separate Jest configurations — a fast, no-database unit suite and a full integration suite backed by a real Postgres container.

```bash
npm test                  # unit tests only (no DB required)
npm run test:integration  # integration tests (requires Docker)
```

### Unit tests — `__tests__/`

Configured in `jest.config.js`. All `__integration__/` directories are excluded via `testPathIgnorePatterns`. Tests run in parallel and complete in a few seconds.

Unit tests verify:
- **Query-builder** — every IR builder (`SelectQueryBuilder`, `InsertQueryBuilder`, `UpdateQueryBuilder`, `DeleteQueryBuilder`, clause builders, condition/join builders) produces the correct AST shape.
- **Drivers** — `PostgresDialect`, `PostgresDialectUtils`, `PostgresParameterManager`, `PostgresConditionCompiler`, and the five DDL compilers are all tested against expected SQL strings; no live connection is used.
- **Schema-builder** — `TableBuilder`, `AlterTableBuilder`, `ColumnBuilder` shape assertions; a compile-time disjointness test (`typeDisjointness.test.ts`) verifies that `Driver.query` and `Driver.ddl` reject each other's types.
- **Migrations** — SHA-256 checksum determinism, error class names and messages, `discoverMigrations` filtering / sorting, `ensureTrackingTable` DDL shape via a mock driver.
- **Model** — `Repository`, `BaseModel`, `DataSource`, `EntityManager` unit behaviour using a mock driver; `compileWhere`, `loadIncludes`, cascade topological sort, driver routing through `AsyncLocalStorage`.
- **Decorators / metadata** — `@Entity`, `@Column`, `@PrimaryKey`, all relation decorators register correct metadata in `DefaultMetadataStorage`.
- **CLI** — argv parser edge cases (`--key=value`, `--key value`, boolean flags, `--`, leading flags, `-h`); `loadConfig` discovery order and validation; `migrationFileName` / `slugify` / `timestampPrefix` shapes; `renderStatusTable` column alignment.

### Integration tests — `__integration__/`

Configured in `jest.integration.config.js`. Key setup:

- **Postgres via Testcontainers.** `globalSetup.ts` pulls `postgres:16-alpine`, starts a container, runs `schema.sql` to seed the schema, and writes connection details to `YAOI_IT_PG_*` environment variables. `globalTeardown.ts` stops the container.
- **`maxWorkers: 1`** — all integration suites run serially to avoid cross-suite races on shared state.
- **`testTimeout: 60000`** — accommodates container pull time on first run.

#### Test isolation

Most integration tests wrap each test body in `withRolledBackTransaction` so no data persists between tests — no `beforeEach` truncation needed:

```ts
it("insert() returns a hydrated instance", async () => {
  await withRolledBackTransaction(fixture.getDataSource(), async (em) => {
    const repo = em.getRepository(User);
    const result = await repo.insert({ email: "alice@example.com", ... });
    expect(result.id).toBeDefined();
    // transaction rolls back here — DB is untouched for the next test
  });
});
```

#### Coverage per module

| Module | Integration files |
|---|---|
| `drivers/postgres` | `crud`, `joins`, `types`, `lifecycle`, `concurrency`, `errors`, `transaction` |
| `schema-builder` | `createTable`, `alterTable`, `dropAndRename`, `e2eParity` (byte-equivalent vs. raw SQL baseline) |
| `migrations` | `up` (ordered apply, `--to`, parallel runners), `down` (most-recent, by-name, out-of-order), `status`, `checksum` (tampered file blocks both `up` and `down`) |
| `cli` | `up`, `down`, `status`, `make` — all run the CLI as a subprocess via `node -r ts-node/register/transpile-only bin/yaoi.ts` |
| `model` | flat CRUD, all four relation includes, nested includes, `select` + `include` combined, upsert, bulk insert/delete, cascade insert, cascade M2M/O2O, custom repositories, all transaction scenarios (commit, rollback, ambient propagation, nested savepoints, read-after-write, concurrency) |

## License

MIT © 2026 Pavlo Petrychenko. See [LICENSE](./LICENSE) for the full text.
