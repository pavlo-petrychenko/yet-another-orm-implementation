## Yet Another ORM Implementation (YAOI)

This project is a custom ORM (Object-Relational Mapping) built with TypeScript as part of my coursework project. The primary goal of this project is to develop a functional ORM, rather than to outperform existing alternatives. It focuses on implementing core ORM features like query building, model handling, and relationship mapping while providing support for complex queries.

## Features

- Decorator-based entity registration (`@Entity`, `@Column`, relation decorators)
- `Repository<T>` + Active-Record `BaseModel` with eager-loaded relations and cascade persistence
- Two-pipeline architecture: DML query builder + DDL schema builder, type-disjoint at compile time
- Programmatic migration runner with SHA-256 checksum enforcement and `pg_advisory_xact_lock`-based concurrency
- `yaoi` CLI with `migrate:make`, `migrate:up`, `migrate:down`, `migrate:status`
- Transactions via `AsyncLocalStorage` — repos and AR statics transparently join the ambient transaction
- Postgres driver today (MySQL / SQLite gated behind `DriverFactory`)

## Tech Stack

- **TypeScript**: For static typing and code scalability.
- **PostgreSQL**: Works with PostgreSQL. In the future will be work with more SQL databases.
- **Node.js**: The environment to run the ORM.
- **pg**: Used to interact with the database.
- **Jest**: Unit testing framework.
- **TypeDoc**: For generating API documentation.
- **Pino**: Logger for tracking events and errors efficiently.

## Project Structure

YAOI is split into eight strictly layered modules under `src/`:

| Module | Role |
|---|---|
| `query-builder/` | Pure DML AST construction (no SQL emitted) |
| `schema-builder/` | Pure DDL AST construction (no SQL emitted) |
| `metadata/` | Global registry of entities/columns/relations |
| `decorators/` | Class/field decorators that populate metadata |
| `drivers/` | Compile DML + DDL AST → SQL, run, manage connections/tx |
| `model/` | Repository, BaseModel, includes, cascades |
| `migrations/` | Programmatic migration runner + `yaoi_migrations` tracking table |
| `cli/` | `bin/yaoi` + `yaoi.config.ts` loader + `migrate:*` commands |

For per-module deep-dives, see `docs/modules/`. For the architecture overview, see `docs/project.md`.

## Quick start: schema and migrations

### 1. Author a config

```ts
// yaoi.config.ts
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
});
```

### 2. Generate a migration

```sh
npx yaoi migrate:make AddUsers
# Created migration: 20260509143022_addusers.ts
# /abs/path/to/migrations/20260509143022_addusers.ts
```

### 3. Fill in the `up` / `down` callbacks

```ts
import type { Migration, SchemaBuilder } from "yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.createTable("users", (t) => {
      t.id();
      t.text("email").notNull().unique();
      t.timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultRaw("NOW()");
    });
  },
  async down(schema: SchemaBuilder): Promise<void> {
    await schema.dropTable("users", { ifExists: true });
  },
};

export default migration;
```

### 4. Run

```sh
npx yaoi migrate:up
# Applied: 20260509143022_addusers
# Applied 1 migration(s).

npx yaoi migrate:status
# STATE     NAME                            APPLIED AT             MISMATCH
# --------  ------------------------------  ---------------------  --------
# applied   20260509143022_addusers         2026-05-09T14:31:01Z   no

npx yaoi migrate:down
# Rolled back: 20260509143022_addusers
```

## CLI reference

```
yaoi migrate:make <name>          # generate a new migration file (offline; no DB connection)
yaoi migrate:up [--to <name>]     # apply pending migrations (optionally up to <name>)
yaoi migrate:down [--name <name>] # roll back the most recently applied migration
yaoi migrate:status               # print the state table

Global flags:
  --config <path>                 # override the default yaoi.config.{ts,js,cjs,mjs} discovery
  --help, -h                      # print usage
```

Exit codes: `0` success, `1` runtime error (incl. checksum drift, broken migration), `2` usage error, `3` config not found / invalid shape.

For an in-repo development run (without `npm run build`):

```sh
npm run cli -- migrate:status
```

See `docs/modules/cli.md` for full command semantics, exit codes, and config file resolution rules. See `docs/modules/migrations.md` for runner internals (transaction protocol, checksum policy, advisory lock).

## About This Project

This ORM was developed as part of my coursework project. The focus is on building a functional ORM with features commonly found in modern ORMs, such as query building, model mapping, and relationship management. While the project is not designed to outperform existing ORM solutions, it aims to provide a learning experience in implementing core ORM functionalities from scratch.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

Integration tests use `@testcontainers/postgresql` — Docker is required for `npm run test:integration`.
