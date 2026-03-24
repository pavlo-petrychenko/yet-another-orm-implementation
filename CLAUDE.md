# YAOI — Yet Another ORM Implementation

A custom TypeScript ORM built as a coursework project. Implements core ORM features: decorator-based entity mapping, a fluent query builder, and a dialect compiler system. PostgreSQL is fully supported; MySQL and SQLite drivers exist but their dialects are stubs.

Package: `@iriskaik/YAOI`

## Project Structure

```
src/
  index.ts                — public API barrel (exports BaseModel, Connection, decorators)
  base-model/             — Active Record model layer (BaseModel, BaseModelStatic)
  connection/             — Singleton database connection manager
  decorators/             — @Entity, @Column, @PrimaryKey, @Relation decorators
  metadata/               — Runtime metadata storage populated by decorators
  query-builder/
    queries/              — Query type interfaces (SELECT, INSERT, UPDATE, DELETE + clause types)
    builder/              — Fluent builder API (QueryBuilder facade, clause builders)
  drivers/
    common/               — Driver, Dialect, DriverConfig interfaces
    DriverFactory.ts      — Factory for creating driver instances
    postgres/             — PostgresDriver + full dialect compiler suite
    mysql/                — MySqlDriver + stub dialect
    sqlite/               — SqliteDriver + stub dialect
  docs/                   — Generated TypeDoc output
```

Each subdirectory has its own `CLAUDE.md` with detailed architecture documentation.

## Commands

| Command | Description |
|---|---|
| `npm test` | Run all tests (Jest + ts-jest) |
| `npm run lint` | Lint `src/` with ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run docs` | Generate API docs with TypeDoc |

## Key Design Patterns

- **Active Record** — `BaseModel` provides static CRUD methods + chainable instance methods
- **Builder** — fluent query construction via `QueryBuilder` facade and clause-specific builders
- **Strategy** — `Dialect` interface allows swapping SQL generation per database engine
- **Factory** — `DriverFactory` creates the correct driver by database type
- **Singleton** — drivers and `Connection` are singletons
- **Decorator + Metadata** — TypeScript decorators collect entity/column/relation info into `MetadataStorage` at class-load time

## Data Flow

```
@Entity / @Column / @PrimaryKey decorators
  → MetadataStorage (collects entity metadata at class-load time)

User.findAll(condition)                         — BaseModelStatic
  → MetadataStorage.getMetadata(User)           — gets table name
  → QueryBuilder.select().from(table).where()   — builds structured Query object
  → returns model instance with queryBuilder attached

instance.orderBy("name").limit(10).execute()    — BaseModel
  → queryBuilder.build()                        — produces SelectQuery
  → Connection.getInstance().getDriver().query()
    → PostgresDialect.buildQuery()              — compiles to { sql, params }
    → pg Pool.query(sql, params)                — executes against database
    → returns rows
```

## Configuration

### TypeScript (`tsconfig.json`)
- Target: ESNext, module: commonjs
- `strict: true` with `strictFunctionTypes: false`, `strictPropertyInitialization: false`
- `experimentalDecorators` + `emitDecoratorMetadata` enabled
- Path alias: `@/*` → `src/*` (`baseUrl: ./src`)
- Outputs to `dist/` with declaration files

### Jest (`jest.config.js`)
- Transform: `ts-jest`
- `@/*` alias mapped via `moduleNameMapper`
- Tests co-located in `__tests__/` directories next to source files

### ESLint (`eslint.config.mjs`)
- ESLint v10 flat config with `typescript-eslint` recommended rules
- `no-explicit-any` turned off (ORM uses `any` for dynamic column values)
- Unused vars with `_` prefix are allowed
- Ignores `dist/`, `docs/`, `jest.config.js`

## Imports

All imports use the `@/` absolute path alias (e.g., `import {Query} from "@/query-builder/queries/Query"`). No relative imports in the codebase.

## Test Status

- 24 test suites, 166 passing tests
- 3 suites with pre-existing failures (5 tests) — see known issues below

## Known Issues

- **`@PrimaryKey` with options does nothing** — the `if (!options)` guard skips registration when options are provided
- **`addPrimaryKey` doesn't register as column** — primary key properties won't appear in `metadata.columns` unless `@Column` is also applied
- **`getMetadata` throws instead of returning `undefined`** — despite the return type signature
- **Falsy values dropped by `insert`/`update`** — `if(value)` check skips `0`, `""`, `false`
- **Stray `console.log`** in `BaseModelStatic.insert`
- **MySQL/SQLite dialects are stubs** — driver classes work but dialect compilation returns empty strings
- **Some `@types/*` and `jest` are in `dependencies`** instead of `devDependencies`
