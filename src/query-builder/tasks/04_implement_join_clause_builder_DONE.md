# Task: Implement JoinClauseBuilder ✅

## Scope
Create the internal `JoinClauseBuilder` class. Accumulates an array of `JoinClause` objects. Each join has a type, table, optional alias, and an ON condition built via `ConditionBuilder` callback.

## File to create
`src/query-builder/builders/internal/JoinClauseBuilder.ts`

## Dependencies
- Task 01 (type imports fixed)
- Task 02 (ConditionBuilder) — used to build ON conditions
- Existing types: `JoinClause` from `types/clause/JoinClause/JoinClause.ts`
- Existing enum: `JoinType` from `types/clause/JoinClause/typedefs.ts`
- Existing types: `TableDescription` from `types/common/`
- Existing enum: `ClauseType` from `types/clause/Clause.ts`
- `ConditionBuilder` from `internal/ConditionBuilder.ts`

## Internal state
- `joins: JoinClause[]` — accumulated join clauses

## Exposed API
| Method | Description |
|--------|-------------|
| `add(joinType, table, onCallback?, alias?)` | Add a join clause. Creates a ConditionBuilder, runs `onCallback` against it, extracts the ON condition via `.build()`. |
| `build(): JoinClause[] | undefined` | Returns the joins array, or `undefined` if empty. |

Parameters:
- `joinType: JoinType` — INNER, LEFT, RIGHT, FULL, CROSS
- `table: string` — table name
- `onCallback?: (builder: ConditionBuilder) => void` — optional (CROSS JOIN has no ON)
- `alias?: string` — optional table alias

## Build behavior
Each `add()` call:
1. Creates a fresh `ConditionBuilder`
2. If `onCallback` provided, calls `onCallback(conditionBuilder)`
3. Calls `conditionBuilder.build()` to get the ON condition
4. Pushes a `JoinClause` to the array:
   ```typescript
   {
     type: ClauseType.Join,
     joinType,
     table: { name: table, ...(alias && { alias }) },
     ...(onCondition && { on: onCondition })
   }
   ```

## Output contract
Each `JoinClause` must match what `PostgresSelectCompiler.addJoinClause()` expects:
- `joinType: JoinType`
- `table: TableDescription` (with optional `alias`)
- `on?: ConditionClause`

## Test coverage
File: `src/query-builder/builders/internal/__tests__/JoinClauseBuilder.test.ts`

Test cases:
- Single INNER JOIN with ON condition produces correct JoinClause
- LEFT/RIGHT/FULL JOIN types are set correctly
- CROSS JOIN with no ON callback → join without `on` field
- Table alias is set on `table.alias`
- ON condition callback receives a ConditionBuilder and produces correct ConditionClause
- Multiple joins accumulate in order
- Empty builder `.build()` returns `undefined`
