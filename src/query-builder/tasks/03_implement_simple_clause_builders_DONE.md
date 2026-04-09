# ~~Task: Implement Simple Clause Builders~~ FIXED

## Scope
Create 5 simple internal clause builders. Each is a thin accumulator that stores state and produces the corresponding clause type from `build()`. These are trivially small (10-30 lines each).

## Files to create
All under `src/query-builder/builders/internal/`:
- `GroupByClauseBuilder.ts`
- `OrderByClauseBuilder.ts`
- `LimitClauseBuilder.ts`
- `OffsetClauseBuilder.ts`
- `ReturningClauseBuilder.ts`

## Dependencies
- Task 01 (type imports fixed)
- Existing types from `types/clause/`: `GroupByClause`, `OrderByClause`, `LimitClause`, `OffsetClause`, `ReturningClause`
- Existing types from `types/common/`: `ColumnDescription`, `OrderDirection`
- Existing enum: `ClauseType` from `types/clause/Clause.ts`

## Shared pattern
Each builder follows this contract:
```
class XClauseBuilder {
  // state accumulation methods
  // ...
  build(): XClause | undefined  // returns undefined when nothing was set
}
```

Returning `undefined` when empty lets query builders skip optional fields cleanly.

## Builder specifications

### GroupByClauseBuilder
**State**: `columns: ColumnDescription[]`
**API**:
- `set(...columns: string[]): void` — parse column strings to ColumnDescription, replaces current list
- `add(...columns: string[]): void` — append columns
- `build(): GroupByClause | undefined` — returns undefined if columns is empty

### OrderByClauseBuilder
**State**: `orders: { column: ColumnDescription; direction: OrderDirection }[]`
**API**:
- `add(column: string, direction: OrderDirection | "ASC" | "DESC"): void` — append an order entry
- `build(): OrderByClause | undefined` — returns undefined if orders is empty

### LimitClauseBuilder
**State**: `count: number | undefined`
**API**:
- `set(count: number): void`
- `build(): LimitClause | undefined` — returns undefined if count not set

### OffsetClauseBuilder
**State**: `count: number | undefined`
**API**:
- `set(count: number): void`
- `build(): OffsetClause | undefined` — returns undefined if count not set

### ReturningClauseBuilder
**State**: `columns: ColumnDescription[]`
**API**:
- `set(...columns: string[]): void` — parse column strings, replaces current list
- `build(): ReturningClause | undefined` — returns undefined if columns is empty

## Column string parsing
All builders that accept column strings should parse `"table.column"` into `{ name: "column", table: "table" }` and plain `"column"` into `{ name: "column" }`. Extract a shared `parseColumn(col: string): ColumnDescription` helper — either as a standalone function in `internal/utils.ts` or inline if preferred.

## Test coverage
File: `src/query-builder/builders/internal/__tests__/ClauseBuilders.test.ts`

Test cases per builder:
- **GroupByClauseBuilder**: `set("a", "b")` → `{ type: ClauseType.GroupBy, columns: [{name:"a"}, {name:"b"}] }`. Empty → `undefined`.
- **OrderByClauseBuilder**: `add("name", "ASC")` → correct OrderByClause. Multiple adds accumulate. Empty → `undefined`.
- **LimitClauseBuilder**: `set(10)` → `{ type: ClauseType.Limit, count: 10 }`. Unset → `undefined`.
- **OffsetClauseBuilder**: `set(5)` → `{ type: ClauseType.Offset, count: 5 }`. Unset → `undefined`.
- **ReturningClauseBuilder**: `set("id", "name")` → correct ReturningClause. Empty → `undefined`.
- **Column parsing**: `"users.name"` → `{ name: "name", table: "users" }`.
