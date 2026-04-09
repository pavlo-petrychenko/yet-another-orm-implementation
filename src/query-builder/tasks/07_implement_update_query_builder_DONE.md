# Task: Implement UpdateQueryBuilder ✅

## Scope
Create the `UpdateQueryBuilder` class. Supports SET values, WHERE conditions, ORDER BY, LIMIT, and RETURNING.

## File to create
`src/query-builder/builders/UpdateQueryBuilder.ts`

## Dependencies
- Task 02 (ConditionBuilder)
- Task 03 (OrderByClauseBuilder, LimitClauseBuilder, ReturningClauseBuilder)
- Types from `query-builder/types/`: `UpdateQuery`, `TableDescription`, `ComparisonOperator`, `QueryType`, `OrderDirection`

## Internal state (private)
| Field | Type | Default | Clause builder |
|-------|------|---------|----------------|
| `_table` | `TableDescription` | — | — |
| `_values` | `Record<string, any>` | `{}` | — |
| `_whereBuilder` | `ConditionBuilder` | new instance | ConditionBuilder |
| `_orderByBuilder` | `OrderByClauseBuilder` | new instance | OrderByClauseBuilder |
| `_limitBuilder` | `LimitClauseBuilder` | new instance | LimitClauseBuilder |
| `_returningBuilder` | `ReturningClauseBuilder` | new instance | ReturningClauseBuilder |

## Exposed API
All methods return `this` for chaining.

| Method | Signature | Description |
|--------|-----------|-------------|
| `table` | `(name: string): this` | Set target table |
| `set` | `(values: Record<string, any>): this` | Merge SET values (can be called multiple times) |
| `where` | `(callback: (builder: ConditionBuilder) => void): this` | WHERE via callback |
| `where` | `(column: string, operator: ComparisonOperator, value?: ConditionValue): this` | WHERE direct |
| `orderBy` | `(column: string, direction?: OrderDirection \| "ASC" \| "DESC"): this` | Add ORDER BY |
| `limit` | `(count: number): this` | Set LIMIT |
| `returning` | `(...columns: string[]): this` | Set RETURNING |
| `build` | `(): UpdateQuery` | Build the query object |

## `build()` assembly
Produce `UpdateQuery` with `type`, `table`, `values` always set. Optionally set `where`, `orderBy`, `limit`, `returning` only if clause builders return non-undefined.

## Test coverage
File: `src/query-builder/builders/__tests__/UpdateQueryBuilder.test.ts`

Test cases:
- `.table("users")` sets table
- `.set({ name: "Bob" })` sets values
- `.set({...}).set({...})` merges values
- `.where(callback)` and `.where(col, op, val)` both work
- `.orderBy()`, `.limit()`, `.returning()` set their clauses
- Full chain produces complete UpdateQuery
- Omitted clauses are absent from output (not undefined, not null — just missing)
- All methods return `this`
