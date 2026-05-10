# YAOI Demo — E-commerce Mini

End-to-end demo of the [`@iriskaik/yaoi`](https://www.npmjs.com/package/@iriskaik/yaoi) ORM with Express. Domain: a small e-commerce schema (users, products, categories, orders, order items, tags) chosen to exercise every relation kind plus transactions.

## Prerequisites

- Node.js >= 18
- Docker + Docker Compose v2 (`docker compose ...`)

## Setup

### 1. Start Postgres

```sh
docker compose up -d
```

Brings up Postgres 16 on `localhost:5433` (5433 to avoid colliding with any local Postgres on 5432) with:

| | |
|---|---|
| user | `yaoi` |
| password | `yaoi` |
| database | `yaoi_demo` |

Override via the standard libpq env vars: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`. The same vars are read by `yaoi.config.ts`.

Stop and wipe with `docker compose down -v`.

### 2. Install dependencies

```sh
npm install
```

This installs `@iriskaik/yaoi` from npm plus Express, TypeScript, and ts-node.

### 3. Apply migrations

```sh
npx yaoi migrate:up
```

You should see one `Applied: …` line per migration.

Inspect state at any time:

```sh
npx yaoi migrate:status
```

To roll back one step:

```sh
npx yaoi migrate:down
```

### 4. Run the dev server

```sh
npm run dev
```

Hits:

- `GET http://localhost:3000/health` → `{"status":"ok","driver":"postgres"}`

Or build + run the compiled output:

```sh
npm run build
npm start
```

## Project layout

```
demo/
├── docker-compose.yml          # local postgres
├── yaoi.config.ts              # driver + migrations dir
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                # express entry
│   └── migrations/
│       ├── 20260510120000_create_users.ts
│       ├── 20260510120100_create_categories_and_products.ts
│       ├── 20260510120200_create_orders_and_items.ts
│       ├── 20260510120300_create_tags_and_product_tags.ts
│       ├── 20260510120400_add_stock_to_products.ts
│       └── 20260510120500_index_orders_by_user.ts
└── README.md
```

## Configuration

`yaoi.config.ts` is the single source of truth for the CLI:

```ts
import { defineConfig, DBType } from "@iriskaik/yaoi";

export default defineConfig({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "yaoi",
    password: process.env.PGPASSWORD ?? "yaoi",
    database: process.env.PGDATABASE ?? "yaoi_demo",
    mode: "pool",
  },
  migrationsDir: "./src/migrations",
});
```

`migrationsDir` is resolved relative to the config file's directory, so `npx yaoi …` works from any subdirectory.

## Migrations included

| File | Capability shown |
|---|---|
| `…_create_users` | `createTable`, `unique`, `timestamps()` helper |
| `…_create_categories_and_products` | two tables in one migration, FK with `onDelete: "restrict"`, `decimal(10,2)` |
| `…_create_orders_and_items` | multiple FKs, `onDelete: "cascade"`, literal + `NOW()` defaults |
| `…_create_tags_and_product_tags` | many-to-many join with **composite primary key** |
| `…_add_stock_to_products` | `alterTable` → `addColumn` with default |
| `…_index_orders_by_user` | `alterTable` → `addIndex` (composite) |

`down` is implemented for every migration — `migrate:down` is reversible end-to-end.

## CLI cheat sheet

```sh
npx yaoi migrate:make <name>      # generate a new migration file (offline)
npx yaoi migrate:up [--to <name>] # apply pending migrations
npx yaoi migrate:down             # roll back the most recent migration
npx yaoi migrate:status           # print state table

npx yaoi --help                   # full reference
```

Exit codes: `0` ok, `1` runtime error (incl. checksum drift, broken migration), `2` usage error, `3` config not found / invalid shape.

## Troubleshooting

- **`ConfigNotFoundError`** — make sure you're in `demo/` (or pass `--config ./yaoi.config.ts`).
- **`ECONNREFUSED 127.0.0.1:5433`** — Postgres isn't up; run `docker compose up -d` and wait for `pg_isready`.
- **`role "yaoi" does not exist`** — you're hitting a different Postgres than the demo's container (port collision or stale env vars). Verify with `docker ps` and check `PGHOST` / `PGPORT` are unset or pointed at the demo container.
- **`ChecksumMismatchError`** — an applied migration's source bytes changed on disk. Either revert the file or roll back, then re-apply. Never edit an already-applied migration in place.
