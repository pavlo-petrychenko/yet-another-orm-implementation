# Task: Implement SelectQueryBuilder

## Scope
Create the `SelectQueryBuilder` class — the most feature-rich query builder. Composes all clause builders. Provides a fluent API for building SELECT queries.

## File to create
`src/query-builder/builders/SelectQueryBuilder.ts`

## Dependencies
- Task 01 (type imports fixed)
- Task 02 (ConditionBuilder)
- Task 03 (GroupByClauseBuilder, OrderByClauseBuilder, LimitClauseBuilder, OffsetClauseBuilder, ReturningClauseBuilder)
- Task 04 (JoinClauseBuilder)
- Existing types: `SelectQuery` from `types/query/SelectQuery/`
- Existing types: `ColumnDescription`, `TableDescription`, `RawExpression` from `types/common/`
- Existing enums: `QueryType`, `ClauseType`, `JoinType`, `OrderDirection`

## Internal state (private)
| Field | Type | Default | Clause builder |
|-------|------|---------|----------------|
| `_table` | `TableDescription` | — | — |
| `_tableAlias` | `string \| undefined` | `undefined` | — |
| `_columns` | `ColumnDescription[]` | `[]` | — |
| `_rawColumns` | `RawExpression[]` | `[]` | — |
| `_distinct` | `boolean` | `false` | — |
| `_unions` | `{ query: SelectQuery; all: boolean }[]` | `[]` | — |
| `_whereBuilder` | `ConditionBuilder` | new instance | ConditionBuilder |
| `_havingBuilder` | `ConditionBuilder` | new instance | ConditionBuilder |
| `_joinBuilder` | `JoinClauseBuilder` | new instance | JoinClauseBuilder |
| `_groupByBuilder` | `GroupByClauseBuilder` | new instance | GroupByClauseBuilder |
| `_orderByBuilder` | `OrderByClauseBuilder` | new instance | OrderByClauseBuilder |
| `_limitBuilder` | `LimitClauseBuilder` | new instance | LimitClauseBuilder |
| `_offsetBuilder` | `OffsetClauseBuilder` | new instance | OffsetClauseBuilder |
| `_returningBuilder` | `ReturningClauseBuilder` | new instance | ReturningClauseBuilder |

## Exposed API
All methods return `this` for chaining.

### Table + columns
| Method | Signature | Description |
|--------|-----------|-------------|
| `from` | `(table: string, alias?: string): this` | Set source table |
| `select` | `(...columns: string[]): this` | Set selected columns (parses "table.col", "col AS alias") |
| `selectRaw` | `(sql: string, params?: any[]): this` | Add raw column expression |
| `distinct` | `(enabled?: boolean): this` | Enable/disable DISTINCT |

### WHERE
| Method | Signature |
|--------|-----------|
| `where` | `(callback: (builder: ConditionBuilder) => void): this` |
| `where` | `(column: string, operator: ComparisonOperator, value?: ConditionValue): this` |
| `andWhere` | `(column: string, operator: ComparisonOperator, value?: ConditionValue): this` |
| `orWhere` | `(column: string, operator: ComparisonOperator, value?: ConditionValue): this` |

The `where` method is overloaded — accepts either callback or direct args.

### JOIN
| Method | Signature |
|--------|-----------|
| `join` | `(table: string, on: (builder: ConditionBuilder) => void, alias?: string): this` |
| `leftJoin` | `(table: string, on: (builder: ConditionBuilder) => void, alias?: string): this` |
| `rightJoin` | `(table: string, on: (builder: ConditionBuilder) => void, alias?: string): this` |
| `fullJoin` | `(table: string, on: (builder: ConditionBuilder) => void, alias?: string): this` |
| `crossJoin` | `(table: string, alias?: string): this` |

Each delegates to `_joinBuilder.add(JoinType.X, table, on, alias)`.

### GROUP BY / HAVING
| Method | Signature |
|--------|-----------|
| `groupBy` | `(...columns: string[]): this` |
| `having` | `(callback: (builder: ConditionBuilder) => void): this` |
| `having` | `(column: string, operator: ComparisonOperator, value?: ConditionValue): this` |

### ORDER BY / LIMIT / OFFSET
| Method | Signature |
|--------|-----------|
| `orderBy` | `(column: string, direction?: OrderDirection \| "ASC" \| "DESC"): this` |
| `limit` | `(count: number): this` |
| `offset` | `(count: number): this` |

### RETURNING
| Method | Signature |
|--------|-----------|
| `returning` | `(...columns: string[]): this` |

### UNION
| Method | Signature |
|--------|-----------|
| `union` | `(query: SelectQuery \| SelectQueryBuilder, all?: boolean): this` |
| `unionAll` | `(query: SelectQuery \| SelectQueryBuilder): this` |

### Build
| Method | Returns |
|--------|---------|
| `build()` | `SelectQuery` |

## `build()` assembly
```typescript
build(): SelectQuery {
  const query: SelectQuery = {
    type: QueryType.SELECT,
    table: this._table,
    columns: this._columns,
  };
  // Set optional fields only if clause builders return non-undefined
  if (this._distinct) query.distinct = true;
  if (this._tableAlias) query.tableAlias = this._tableAlias;
  if (this._rawColumns.length) query.rawColumns = this._rawColumns;
  // where, join, groupBy, having, orderBy, limit, offset, returning, unions
  // Each: const x = this._xBuilder.build(); if (x) query.x = x;
  return query;
}
```

## Column parsing
Support these string formats:
- `"column"` → `{ name: "column" }`
- `"table.column"` → `{ name: "column", table: "table" }`
- `"column AS alias"` → `{ name: "column", alias: "alias" }`
- `"table.column AS alias"` → `{ name: "column", table: "table", alias: "alias" }`

Reuse the `parseColumn` helper from Task 03 or define locally.

## Test coverage
File: `src/query-builder/builders/__tests__/SelectQueryBuilder.test.ts`

Test cases:
- `.from("users")` → `table: { name: "users" }`
- `.from("users", "u")` → table with alias, `tableAlias` set
- `.select("id", "name")` → columns array with ColumnDescriptions
- `.select("users.name AS username")` → parsed column with table + alias
- `.selectRaw("COUNT(*) AS total")` → rawColumns entry
- `.distinct()` → `distinct: true`
- `.where((w) => w.where("age", ">", 18))` → where clause present
- `.where("age", ">", 18)` → direct shorthand produces same result
- `.andWhere()` / `.orWhere()` delegate correctly
- `.join("orders", (on) => on.where("users.id", "=", "orders.user_id", true))` → join with ON condition
- `.leftJoin()` / `.rightJoin()` / `.fullJoin()` → correct join types
- `.crossJoin("other")` → join without ON
- `.groupBy("status")` → groupBy clause
- `.having((h) => h.where("count", ">", 5))` → having clause
- `.orderBy("name", "ASC")` → orderBy clause
- `.limit(10)` → limit clause
- `.offset(20)` → offset clause
- `.returning("id")` → returning clause
- `.union(otherQuery)` / `.unionAll(otherBuilder)` → unions array
- Full chain: `.from().select().where().orderBy().limit().build()` → complete SelectQuery
- Empty builder (no clauses set) → minimal SelectQuery with only `type`, `table`, `columns`
- All methods return `this` (chaining works)
