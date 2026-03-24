# Query Builder

The query builder produces **structured query objects** (plain data), not SQL strings. SQL generation is handled separately by dialect compilers (see `src/drivers/*/dialect/`).

## Architecture

Two layers: **query types** (data structures) and **builders** (fluent API to construct them).

### Query Types (`queries/`)

Interfaces describing the shape of each SQL operation.

```
QueryCommon (base: type, table, + optional clauses from QueryDescription)
  ├── SelectQuery   — adds columns: ColumnDescription[], distinct?: boolean
  ├── InsertQuery   — adds values: Record<string, any> | Record<string, any>[]
  ├── UpdateQuery   — adds values: Record<string, any>
  └── DeleteQuery   — no extra fields
```

`Query` is the union type: `SelectQuery | InsertQuery | UpdateQuery | DeleteQuery`.

**Clause types** in `queries/common/`:

| Type | Key fields |
|---|---|
| `ConditionClause` | Union of `BaseCondition` (leaf) and `ConditionGroup` (nested tree) |
| `JoinClause` | `type` (INNER/LEFT/RIGHT/FULL), `table`, `on` (ConditionClause) |
| `GroupByClause` | `columns: ColumnDescription[]` |
| `OrderByClause` | `orders: { column, direction }[]` |
| `LimitClause` | `count: number` |
| `OffsetClause` | `count: number` |
| `ReturningClause` | `columns: ColumnDescription[]` |
| `ColumnDescription` | `name`, optional `table`, optional `alias` |

`QueryDescription` in `CommonQueryDescription.ts` aggregates all optional clauses into one interface that `QueryCommon` extends.

### Builders (`builder/`)

Fluent API that constructs query type objects via method chaining.

**Entry point:** `QueryBuilder` (Facade pattern)
- `.select()` → `SelectQueryBuilder`
- `.insert()` → `InsertQueryBuilder`
- `.update()` → `UpdateQueryBuilder`
- `.delete()` → `DeleteQueryBuilder`
- `.findOne(condition)` / `.findAll(condition)` — convenience shortcuts that pre-configure SELECT with WHERE and LIMIT.

**Inheritance:**

```
ClauseMixin (abstract)
  ├── SelectQueryBuilder  — adds .select(), .from()
  ├── UpdateQueryBuilder  — adds .table(), .set()
  └── DeleteQueryBuilder  — adds .from()

InsertQueryBuilder (standalone) — adds .into(), .valuesList()
```

`ClauseMixin` provides `.where()`, `.having()`, `.groupBy()`, `.orderBy()`, `.limit()`, `.offset()`, `.returning()`, `.innerJoin()`, `.leftJoin()`, `.rightJoin()`, `.fullJoin()`, `.crossJoin()`. It delegates to dedicated clause builders internally.

**Clause builders** in `builder/common/`:

| Builder | Builds | Notes |
|---|---|---|
| `WhereClauseBuilder` | `ConditionGroup` | Supports `.where()`, `.andWhere()`, `.orWhere()`, `.whereNot()`, `.whereIn()` (values or subquery callback), `.whereLike()`, `.whereILike()`, `.whereBetween()`, `.whereNull()`, `.whereNotNull()`, `.whereRaw()`, `.group()` for nested conditions. Also used for HAVING clause. |
| `JoinClauseBuilder` | `JoinClause[]` | `.join()`, `.leftJoin()`, `.rightJoin()`, `.fullJoin()`, `.crossJoin()` — all support `"table AS alias"` syntax |
| `GroupByBuilder` | `GroupByClause` | `.add(column)` |
| `OrderByBuilder` | `OrderByClause` | `.add(column, direction)` |
| `LimitBuilder` | `LimitClause` | `.set(count)` — validates non-negative integer |
| `OffsetBuilder` | `OffsetClause` | `.set(count)` — validates non-negative integer |

Every builder has a `.build()` method returning its corresponding query type (or `null` if empty).

## Data Flow

```
User code → QueryBuilder (facade)
  → specific builder (e.g. SelectQueryBuilder)
    → clause builders (WhereClauseBuilder, etc.)
      → .build() returns structured query object (SelectQuery, etc.)
        → passed to Driver.query() → Dialect compiler → SQL string
```

## WHERE Clause Model

Conditions form a recursive tree:

- `BaseCondition` — leaf node: `left operator right` (e.g., `"age" > 18`). Operators include `=`, `<>`, `>`, `<`, `>=`, `<=`, `IN`, `NOT IN`, `LIKE`, `NOT LIKE`, `ILIKE`, `NOT ILIKE`, `BETWEEN`, `NOT BETWEEN`, `IS NULL`, `IS NOT NULL`.
- `ConditionGroup` — branch node: contains `ConditionClause[]` with logical connectors (AND, OR, AND NOT, OR NOT)
- `RawCondition` — raw SQL condition: `sql` + `params[]`, bypasses structured model

The `WhereClauseBuilder` constructs this tree. Nested groups are built via `.group(connector, builderFn)` which creates a sub-builder. Subqueries in `whereIn` use a callback: `.whereIn("id", qb => qb.from("t").select("col"))`.

## Tests

Co-located in `__tests__/` directories next to each builder. All builders and the facade have unit tests. Tests validate the built query structures, not SQL output.

## Conventions

- All builders use pino logger for debug/error output
- Builders validate inputs (empty strings, invalid types) and throw descriptive errors
- `ColumnDescription` supports `"name AS alias"` string parsing (case-insensitive) in `WhereClauseBuilder` and `SelectQueryBuilder`
- `SelectQueryBuilder` supports `.distinct()` for `SELECT DISTINCT`
- `InsertQueryBuilder` supports batch insert via `valuesList([{...}, {...}])`
- INSERT, UPDATE, DELETE builders support `.returning(...columns)` for PostgreSQL `RETURNING` clause
- `ClauseMixin` supports `.having(callback)` for `HAVING` clause (reuses `WhereClauseBuilder`)
- Table aliases: `.from("users AS u")` and `.innerJoin("orders AS o", ...)` parse alias from string
- `SelectQueryBuilder` supports `.selectRaw(expr)` for raw SQL in column list
- `SelectQueryBuilder` supports `.union(query)` and `.unionAll(query)` for combining SELECTs
- Aggregate helpers in `utils/aggregates.ts`: `count()`, `sum()`, `avg()`, `max()`, `min()` return `RawExpression`
- `RawExpression` type in `queries/common/RawExpression.ts` with `raw()` factory function
