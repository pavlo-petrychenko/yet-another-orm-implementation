# Drivers

Database-specific layer responsible for connecting, executing queries, and compiling structured query objects into SQL strings. Follows the Strategy pattern — each database engine has its own driver and dialect.

## Architecture

### Common Interfaces (`common/`)

**`Driver`** — interface every driver implements:

| Method | Description |
|---|---|
| `connect()` | Establishes the database connection |
| `disconnect()` | Closes the connection and cleans up |
| `query(query: Query)` | Compiles the query via the dialect, executes it, returns rows |
| `isConnected()` | Returns `true` if connected |
| `getDialect()` | Returns the `Dialect` instance |

**`Dialect`** — interface every dialect implements:

| Method | Description |
|---|---|
| `buildQuery(query: Query)` | Converts a structured `Query` object into `{ sql: string, params: any[] }` |

**`DriverConfig`** — shared config shape: `url?`, `host?`, `port?`, `username?`, `password?`, `database?`, `filename?`.

### DriverFactory (`DriverFactory.ts`)

Static factory method `createDriver(dbType, config)` that switches on `dbType` (`"postgres"` / `"mysql"` / `"sqlite"`) and returns the corresponding driver singleton.

### Driver Implementations

All drivers are **singletons** (`getInstance()` pattern). They use pino for logging and wrap connection errors with descriptive messages.

| Driver | DB library | Connection type | Dialect |
|---|---|---|---|
| `PostgresDriver` | `pg` (`Pool`) | Connection pool | `PostgresDialect` (fully implemented) |
| `MySqlDriver` | `mysql2/promise` (`Pool`) | Connection pool | `MySqlDialect` (stub) |
| `SqliteDriver` | `sqlite3` (`Database`) | Single file connection | `SqliteDialect` (stub) |

`PostgresDriver` also uses the `debug` package (namespaces: `postgres:query`, `postgres:error`, `postgres:timing`).

## PostgreSQL Dialect — Compiler Architecture

The only fully implemented dialect. Compiles structured `Query` objects into parameterized PostgreSQL SQL (`$1`, `$2`, ...).

### Components

```
PostgresDialect
  ├── PostgresParameterManager  — tracks $N parameter counter, reset per query
  ├── PostgresDialectUtils      — escapes identifiers ("table", "col"), handles ColumnDescription formatting
  ├── PostgresConditionCompiler — compiles WHERE/ON condition trees recursively
  └── queryCompilers Map:
        ├── "SELECT" → PostgresSelectCompiler
        ├── "INSERT" → PostgresInsertCompiler
        ├── "UPDATE" → PostgresUpdateCompiler
        └── "DELETE" → PostgresDeleteCompiler
```

### Compiler Hierarchy

```
PostgresQueryCompiler (abstract)
  — shared: addTable, addWhereClause, addReturningClause, addGroupByClause, addLimitClause, addOffsetClause
  ├── PostgresSelectCompiler  — addColumns, addFromClause, addJoinClause, addOrderByClause
  ├── PostgresInsertCompiler  — addValues (supports single and batch inserts)
  ├── PostgresUpdateCompiler  — addSetClause
  └── PostgresDeleteCompiler  — (uses only base methods)
```

All compilers receive `PostgresParameterManager`, `PostgresDialectUtils`, and `PostgresConditionCompiler` via constructor injection.

### Compilation Flow

```
PostgresDialect.buildQuery(query)
  → paramManager.reset()
  → look up compiler by query.type
  → compiler.compile(query) → returns CompiledQuery { sql, params }
```

### Types (`dialect/types/`)

- **`CompiledQuery`** — `{ sql: string, params: any[] }` — output of all compilers.
- **`SQL`** — const object with SQL keyword strings (`SELECT`, `INSERT INTO`, `UPDATE`, `DELETE FROM`, etc.) used by compilers.

### Utilities (`dialect/utils/`)

- **`PostgresParameterManager`** — generates `$1`, `$2`, ... placeholders. `.reset()` restarts the counter (called before each query compilation).
- **`PostgresDialectUtils`** — `escapeIdentifier(str | ColumnDescription)` handles quoting (`"name"`), qualified columns (`"table"."col"`), and aliases (`"col" AS "alias"`).

### Condition Compiler (`PostgresConditionCompiler`)

Recursively compiles the `ConditionClause` tree (from the query builder's WHERE model):

- `BaseCondition` → `"col" operator $N` (or `"col" IN ($1, $2)` for arrays)
- `ConditionGroup` → `(cond1 AND cond2 OR cond3)` with recursive descent
- Supports `IS NULL` / `IS NOT NULL` (no parameter), `BETWEEN` (two parameters), `LIKE` / `ILIKE`, column-to-column comparisons

## MySQL / SQLite Dialects

Both dialects have the class structure in place but their compilation methods are **stubs** — they return `{ sql: "", params }`. The helper methods (`escapeIdentifier`, `parameterize`, `buildWhere`) exist but the `buildSelect`, `buildInsert`, `buildUpdate`, `buildDelete` methods are not implemented.

## Config Types

- `PostgresConfig` — type alias for `DriverConfig`
- `MySqlConfig` — type alias for `DriverConfig`
- `SqliteDriverConfig` — extends `DriverConfig` with required `filename: string`

## Tests

Co-located in `__tests__/` directories within the postgres dialect:
- `PostgresDialect.test.ts` — routes queries to correct compiler, resets param manager
- `PostgresUpdateCompiler.test.ts` — SET clause compilation, type validation
- `PostgresConditonCompiler.test.ts` — base conditions, groups, IN/array, column comparisons
- `PostgresQueryCompiler.test.ts` — base class methods (WHERE, RETURNING, LIMIT, OFFSET, GROUP BY)
- `PostgresDialectUtils.test.ts` — identifier escaping, qualified columns, aliases
- `PostgresParameterManager.test.ts` — counter increment and reset
