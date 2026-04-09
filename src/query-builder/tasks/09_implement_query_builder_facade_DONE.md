# Task: Implement QueryBuilder Facade

## Scope
Rewrite the `QueryBuilder` class as the single entry point. It is a stateless factory — each method creates and returns a fresh query-specific builder.

## File to modify
`src/query-builder/builders/QueryBuilder.ts`

## Dependencies
- Task 05 (SelectQueryBuilder)
- Task 06 (InsertQueryBuilder)
- Task 07 (UpdateQueryBuilder)
- Task 08 (DeleteQueryBuilder)

## Exposed API
| Method | Signature | Description |
|--------|-----------|-------------|
| `select` | `(...columns?: string[]): SelectQueryBuilder` | Create SELECT builder, optionally pre-set columns |
| `insert` | `(): InsertQueryBuilder` | Create INSERT builder |
| `update` | `(): UpdateQueryBuilder` | Create UPDATE builder |
| `delete` | `(): DeleteQueryBuilder` | Create DELETE builder |

## Type safety
Return types are exact — `select()` returns `SelectQueryBuilder`, not a base type. Consumer gets full autocomplete for only the methods relevant to that query type.

## Test coverage
File: `src/query-builder/builders/__tests__/QueryBuilder.test.ts`

Test cases:
- `.select()` returns instance of `SelectQueryBuilder`
- `.select("id", "name")` returns SelectQueryBuilder with columns pre-set
- `.insert()` returns instance of `InsertQueryBuilder`
- `.update()` returns instance of `UpdateQueryBuilder`
- `.delete()` returns instance of `DeleteQueryBuilder`
- Each call returns a fresh instance (no shared state)
