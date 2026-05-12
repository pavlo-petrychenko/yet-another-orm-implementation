# YAOI — Yet Another ORM Implementation

> A TypeScript ORM for PostgreSQL with decorator-based entities, a two-pipeline DML/DDL architecture, and a programmatic migration runner with checksum enforcement.

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

## Repository

## BaseModel (Active Record)

## Query Builder

## Schema Builder

## Migrations

## CLI

## Transactions

## Type Utilities

---

## Testing

## License
