# Task: Implement InsertQueryBuilder ✅ DONE

## Scope
Create the `InsertQueryBuilder` class — the simplest query builder. Only needs table, values, and returning.

## File to create
`src/query-builder/builders/InsertQueryBuilder.ts`

## Dependencies
- Task 01 (type imports fixed)
- Task 03 (ReturningClauseBuilder)
- Existing types: `InsertQuery` from `types/query/InsertQuery/`
- Existing types: `TableDescription` from `types/common/`
- Existing enums: `QueryType`

## Internal state (private)
| Field | Type | Default | Clause builder |
|-------|------|---------|----------------|
| `_table` | `TableDescription` | — | — |
| `_values` | `Record<string, any>[]` | `[]` | — |
| `_returningBuilder` | `ReturningClauseBuilder` | new instance | ReturningClauseBuilder |

## Exposed API
All methods return `this` for chaining.

| Method | Signature | Description |
|--------|-----------|-------------|
| `into` | `(table: string): this` | Set target table |
| `values` | `(record: Record<string, any>): this` | Add a single row |
| `valuesList` | `(records: Record<string, any> \| Record<string, any>[]): this` | Add single or multiple rows |
| `returning` | `(...columns: string[]): this` | Set RETURNING columns |
| `build` | `(): InsertQuery` | Build the query object |

## `build()` assembly
```typescript
build(): InsertQuery {
  const query: InsertQuery = {
    type: QueryType.INSERT,
    table: this._table,
    values: this._values,
  };
  const returning = this._returningBuilder.build();
  if (returning) query.returning = returning;
  return query;
}
```

## Test coverage
File: `src/query-builder/builders/__tests__/InsertQueryBuilder.test.ts`

Test cases:
- `.into("users")` → `table: { name: "users" }`
- `.values({ name: "Alice", age: 30 })` → single record in values array
- `.values(r1).values(r2)` → both records in values array (accumulates)
- `.valuesList({ name: "Alice" })` → single record wrapped in array
- `.valuesList([{ name: "A" }, { name: "B" }])` → both records in values array
- `.returning("id")` → returning clause present
- `.returning("id", "created_at")` → multiple returning columns
- Full chain: `.into("users").valuesList({...}).returning("id").build()` → complete InsertQuery
- Empty values: `.into("users").build()` → InsertQuery with `values: []`
- All methods return `this`
