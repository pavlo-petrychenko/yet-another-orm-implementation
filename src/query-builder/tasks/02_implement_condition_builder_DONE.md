# ~~Task: Implement ConditionBuilder~~ FIXED

## Scope
Create the internal `ConditionBuilder` class — the WHERE/HAVING clause accumulator. This is the most complex internal builder. Consumers interact with it only through callbacks: `.where((w) => { w.where("col", "=", val) })`.

## File to create
`src/query-builder/builders/internal/ConditionBuilder.ts`

## Dependencies
- Task 01 (type imports fixed)
- Existing types: `ConditionClause`, `BaseCondition`, `ConditionGroup`, `RawCondition` from `types/clause/ConditionClause/`
- Existing types: `ComparisonOperator`, `LogicalOperator` from `types/common/`
- Existing types: `ColumnDescription` from `types/common/`
- Existing enums: `ClauseType` from `types/clause/Clause.ts`, `ConditionType` from `types/clause/ConditionClause/typedefs.ts`

## Internal state
- `conditions: ConditionClause[]` — accumulated conditions array
- `rootGroup` / `currentGroup` pattern — a root `ConditionGroup` that wraps all conditions

## Exposed API
All methods return `this` for chaining.

### Base conditions
| Method | Connector | Description |
|--------|-----------|-------------|
| `where(left, operator, right, isColumnComparison?)` | none (first) | Add first condition |
| `andWhere(left, operator, right, isColumnComparison?)` | AND | Add AND condition |
| `orWhere(left, operator, right, isColumnComparison?)` | OR | Add OR condition |
| `whereNot(left, operator, right, isColumnComparison?)` | AND NOT | Add AND NOT condition |
| `orWhereNot(left, operator, right, isColumnComparison?)` | OR NOT | Add OR NOT condition |

Parameter types:
- `left: string` — column name (parsed to `ColumnDescription`)
- `operator: ComparisonOperator`
- `right: string | number | (string | number)[]` — value(s)
- `isColumnComparison?: boolean` — when true, `right` is treated as column reference

### Convenience conditions
| Method | Operator used | Connector |
|--------|---------------|-----------|
| `whereIn(column, values)` | IN | AND |
| `whereNotIn(column, values)` | NOT IN | AND |
| `orWhereIn(column, values)` | IN | OR |
| `orWhereNotIn(column, values)` | NOT IN | OR |
| `whereLike(column, pattern)` | LIKE | AND |
| `orWhereLike(column, pattern)` | LIKE | OR |
| `whereNotLike(column, pattern)` | NOT LIKE | AND |
| `whereILike(column, pattern)` | ILIKE | AND |
| `orWhereILike(column, pattern)` | ILIKE | OR |
| `whereNotILike(column, pattern)` | NOT ILIKE | AND |
| `whereBetween(column, min, max)` | BETWEEN | AND |
| `orWhereBetween(column, min, max)` | BETWEEN | OR |
| `whereNotBetween(column, min, max)` | NOT BETWEEN | AND |
| `orWhereNotBetween(column, min, max)` | NOT BETWEEN | OR |
| `whereNull(column)` | IS NULL | AND |
| `orWhereNull(column)` | IS NULL | OR |
| `whereNotNull(column)` | IS NOT NULL | AND |
| `orWhereNotNull(column)` | IS NOT NULL | OR |

### Raw + grouping
| Method | Description |
|--------|-------------|
| `whereRaw(sql, params?)` | Raw SQL condition (AND) |
| `orWhereRaw(sql, params?)` | Raw SQL condition (OR) |
| `group(connector, callback)` | Nested condition group via `(builder: ConditionBuilder) => void` |

### Build
| Method | Returns |
|--------|---------|
| `build()` | `ConditionGroup` — the root group wrapping all conditions. Returns a group with empty `conditions[]` if nothing was added. |

## Output contract
`build()` must return a `ConditionGroup` compatible with what `PostgresConditionCompiler` expects:
- `type: ClauseType.Condition`
- `conditionType: ConditionType.Group`
- `conditions: ConditionClause[]`
- Each `BaseCondition` in the array must have: `left: ColumnDescription`, `operator: ComparisonOperator`, `right: ColumnDescription | ColumnDescription[] | string | number | (string|number)[] | SelectQuery | null`, `connector?: LogicalOperator`

## Test coverage
File: `src/query-builder/builders/internal/__tests__/ConditionBuilder.test.ts`

Test cases:
- Single `.where()` produces one BaseCondition
- `.where().andWhere()` chain produces two conditions with correct connectors
- `.orWhere()` sets `LogicalOperator.OR` connector
- `.whereNot()` sets `LogicalOperator.AND_NOT`
- `.whereIn("col", [1,2,3])` produces condition with `operator: "IN"` and array right value
- `.whereNotIn()` produces `operator: "NOT IN"`
- `.whereLike("col", "%pattern%")` produces condition with `operator: "LIKE"`
- `.whereILike()` produces `operator: "ILIKE"`
- `.whereBetween("col", 1, 10)` produces condition with `operator: "BETWEEN"` and `right: [1, 10]`
- `.whereNull("col")` produces condition with `operator: "IS NULL"` and `right: null`
- `.whereNotNull("col")` produces `operator: "IS NOT NULL"`
- `.whereRaw("age > $1", [18])` produces RawCondition with correct sql/params
- `.group(LogicalOperator.OR, (w) => { w.where(...); w.andWhere(...) })` produces nested ConditionGroup
- `isColumnComparison: true` sets the flag on BaseCondition
- Empty builder `.build()` returns ConditionGroup with empty conditions array
- Chaining: all methods return `this`
