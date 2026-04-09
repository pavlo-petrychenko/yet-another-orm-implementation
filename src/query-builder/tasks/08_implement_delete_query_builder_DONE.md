# Task: Implement DeleteQueryBuilder

## Scope
Create the `DeleteQueryBuilder` class. Supports WHERE conditions, ORDER BY, LIMIT, and RETURNING.

## File to create
`src/query-builder/builders/DeleteQueryBuilder.ts`

## Dependencies
- Task 02 (ConditionBuilder)
- Task 03 (OrderByClauseBuilder, LimitClauseBuilder, ReturningClauseBuilder)
- Types from `query-builder/types/`: `DeleteQuery`, `TableDescription`, `ComparisonOperator`, `QueryType`, `OrderDirection`

## Internal state (private)
| Field | Type | Default | Clause builder |
|-------|------|---------|----------------|
| `_table` | `TableDescription` | — | — |
| `_whereBuilder` | `ConditionBuilder` | new instance | ConditionBuilder |
| `_orderByBuilder` | `OrderByClauseBuilder` | new instance | OrderByClauseBuilder |
| `_limitBuilder` | `LimitClauseBuilder` | new instance | LimitClauseBuilder |
| `_returningBuilder` | `ReturningClauseBuilder` | new instance | ReturningClauseBuilder |

## Exposed API
All methods return `this` for chaining.

| Method | Signature | Description |
|--------|-----------|-------------|
| `from` | `(table: string): this` | Set target table |
| `where` | `(callback: (builder: ConditionBuilder) => void): this` | WHERE via callback |
| `where` | `(column: string, operator: ComparisonOperator, value?: ConditionValue): this` | WHERE direct |
| `orderBy` | `(column: string, direction?: OrderDirection \| "ASC" \| "DESC"): this` | Add ORDER BY |
| `limit` | `(count: number): this` | Set LIMIT |
| `returning` | `(...columns: string[]): this` | Set RETURNING |
| `build` | `(): DeleteQuery` | Build the query object |

## `build()` assembly
Produce `DeleteQuery` with `type`, `table` always set. Optionally set `where`, `orderBy`, `limit`, `returning` only if clause builders return non-undefined.

## Test coverage
File: `src/query-builder/builders/__tests__/DeleteQueryBuilder.test.ts`

Test cases:
- `.from("users")` sets table
- `.where(callback)` and `.where(col, op, val)` both work
- `.orderBy()`, `.limit()`, `.returning()` set their clauses
- Full chain produces complete DeleteQuery
- Omitted clauses are absent from output
- All methods return `this`

_DONE
