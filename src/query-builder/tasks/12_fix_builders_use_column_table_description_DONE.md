# Task: Fix all builders to use strictly typed parameters

## Problem
All query builders and internal clause builders accept plain `string` for column and table parameters, then internally convert them via `parseColumn()` or inline `{ name: table }`. Parameters like `OrderDirection` also accept raw string literals (`"ASC" | "DESC"`) alongside the enum. This defeats the purpose of having `ColumnDescription`, `TableDescription`, `OrderDirection`, and `ComparisonOperator` types. All parameters must be strictly typed — no `string` accepted.

## Approach
- Replace every `string` column parameter with `ColumnDescription`
- Replace every `string` table parameter with `TableDescription`
- Replace every `OrderDirection | "ASC" | "DESC"` with just `OrderDirection`
- Remove `parseColumn()` calls — callers must pass `ColumnDescription` objects directly
- Remove `parseColumn` helper from `utils.ts` (dead code after this change)
- Remove the `alias` parameter from methods like `from(table, alias)` — alias belongs inside `TableDescription`

## Files to modify

### `builders/internal/utils.ts`
- Remove `parseColumn` function entirely (no longer needed)

### `builders/internal/ConditionBuilder.ts`
| Method(s) | Current | After |
|-----------|---------|-------|
| `where`, `andWhere`, `orWhere`, `whereNot`, `orWhereNot` | `left: string` | `left: ColumnDescription` |
| `whereIn`, `whereNotIn`, `orWhereIn`, `orWhereNotIn` | `column: string` | `column: ColumnDescription` |
| `whereLike`, `orWhereLike`, `whereNotLike` | `column: string` | `column: ColumnDescription` |
| `whereILike`, `orWhereILike`, `whereNotILike` | `column: string` | `column: ColumnDescription` |
| `whereBetween`, `orWhereBetween`, `whereNotBetween`, `orWhereNotBetween` | `column: string` | `column: ColumnDescription` |
| `whereNull`, `orWhereNull`, `whereNotNull`, `orWhereNotNull` | `column: string` | `column: ColumnDescription` |
| `addCondition` (private) | `left: string` | `left: ColumnDescription` |
| `addNullCondition` (private) | `column: string` | `column: ColumnDescription` |

Also update the `right` parameter in `where`/`andWhere`/`orWhere` when `isColumnComparison` is true — `right` should accept `ColumnDescription` (instead of parsing a string).

Remove all `parseColumn()` calls — use the `ColumnDescription` parameter directly.

### `builders/internal/JoinClauseBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `add` | `table: string`, `alias?: string` | `table: TableDescription` |

Remove inline `{ name: table, ...(alias && { alias }) }` — use `table` directly.

### `builders/internal/OrderByClauseBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `add` | `column: string, direction: OrderDirection \| "ASC" \| "DESC"` | `column: ColumnDescription, direction: OrderDirection` |

Remove `parseColumn()` call — use `column` directly.

### `builders/internal/GroupByClauseBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `set` | `...columns: string[]` | `...columns: ColumnDescription[]` |
| `add` | `...columns: string[]` | `...columns: ColumnDescription[]` |

Remove `.map(parseColumn)` — use `columns` directly.

### `builders/internal/ReturningClauseBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `set` | `...columns: string[]` | `...columns: ColumnDescription[]` |

Remove `.map(parseColumn)` — use `columns` directly.

### `builders/SelectQueryBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `from` | `(table: string, alias?: string)` | `(table: TableDescription)` |
| `select` | `(...columns: string[])` | `(...columns: ColumnDescription[])` |
| `where` (non-callback overload) | `(column: string, operator: ComparisonOperator, value?)` | `(column: ColumnDescription, operator: ComparisonOperator, value?)` |
| `andWhere` | `(column: string, ...)` | `(column: ColumnDescription, ...)` |
| `orWhere` | `(column: string, ...)` | `(column: ColumnDescription, ...)` |
| `join`, `leftJoin`, `rightJoin`, `fullJoin` | `(table: string, on: ..., alias?: string)` | `(table: TableDescription, on: ...)` |
| `crossJoin` | `(table: string, alias?: string)` | `(table: TableDescription)` |
| `groupBy` | `(...columns: string[])` | `(...columns: ColumnDescription[])` |
| `having` (non-callback overload) | `(column: string, ...)` | `(column: ColumnDescription, ...)` |
| `orderBy` | `(column: string, direction: OrderDirection \| "ASC" \| "DESC")` | `(column: ColumnDescription, direction: OrderDirection)` |
| `returning` | `(...columns: string[])` | `(...columns: ColumnDescription[])` |

Remove `parseColumn` import. Remove `_tableAlias` field — alias is now inside `TableDescription`.
Update `from()`: assign `this._table = table` directly, set `this._tableAlias = table.alias`.
Update `select()`: assign `this._columns = columns` directly (no `.map(parseColumn)`).

### `builders/InsertQueryBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `into` | `(table: string)` | `(table: TableDescription)` |
| `returning` | `(...columns: string[])` | `(...columns: ColumnDescription[])` |

### `builders/UpdateQueryBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `table` | `(name: string)` | `(table: TableDescription)` |
| `where` (non-callback overload) | `(column: string, ...)` | `(column: ColumnDescription, ...)` |
| `orderBy` | `(column: string, direction: OrderDirection \| "ASC" \| "DESC")` | `(column: ColumnDescription, direction: OrderDirection)` |
| `returning` | `(...columns: string[])` | `(...columns: ColumnDescription[])` |

### `builders/DeleteQueryBuilder.ts`
| Method | Current | After |
|--------|---------|-------|
| `from` | `(table: string)` | `(table: TableDescription)` |
| `where` (non-callback overload) | `(column: string, ...)` | `(column: ColumnDescription, ...)` |
| `orderBy` | `(column: string, direction: OrderDirection \| "ASC" \| "DESC")` | `(column: ColumnDescription, direction: OrderDirection)` |
| `returning` | `(...columns: string[])` | `(...columns: ColumnDescription[])` |

## ConditionBuilder `right` parameter with `isColumnComparison`

Currently `right` is `string | number | (string | number)[]` and when `isColumnComparison` is true the string is parsed via `parseColumn()`. Change the `right` type to `ColumnDescription | string | number | (string | number)[]` or introduce a separate overload/method. When `isColumnComparison` is true, `right` must be `ColumnDescription` — no string parsing.

## Updating tests

All existing tests that pass strings to builders must be updated to pass `ColumnDescription` / `TableDescription` objects instead. For example:

```typescript
// Before
builder.from("users").select("id", "name")

// After
builder
  .from({ name: "users" })
  .select({ name: "id" }, { name: "name" })
```

## Test coverage
File: `src/query-builder/builders/__tests__/ColumnTableDescription.test.ts`

Test cases:
- `SelectQueryBuilder.from({ name: "users" })` -> `table: { name: "users" }`
- `SelectQueryBuilder.from({ name: "users", alias: "u" })` -> table with alias, `tableAlias` set from `table.alias`
- `SelectQueryBuilder.select({ name: "id" }, { name: "email", alias: "mail" })` -> columns from objects
- `InsertQueryBuilder.into({ name: "orders" })` -> table from object
- `UpdateQueryBuilder.table({ name: "products" })` -> table from object
- `DeleteQueryBuilder.from({ name: "logs" })` -> table from object
- `.where({ name: "age", table: "users" }, ">", 18)` -> `ColumnDescription` in condition
- `.orderBy({ name: "created_at" }, OrderDirection.DESC)` -> `ColumnDescription` + enum in orderBy
- `.groupBy({ name: "status" })` -> `ColumnDescription` in groupBy
- `.returning({ name: "id" })` -> `ColumnDescription` in returning
- `.join({ name: "orders", alias: "o" }, ...)` -> `TableDescription` in join
- `ConditionBuilder.where({ name: "col" }, "=", 1)` -> `ColumnDescription` directly
- Column comparison: `.where({ name: "a" }, "=", { name: "b" }, true)` -> both sides are `ColumnDescription`
- Compile-time: passing a plain `string` where `ColumnDescription` is expected must be a type error
