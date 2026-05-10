# query-builder

**Purpose:** Pure AST construction layer — builds a typed `Query` object (SELECT / INSERT / UPDATE / DELETE) from a fluent API without emitting any SQL. SQL emission is the responsibility of downstream dialect compilers in `src/drivers/`.

## Architecture

- `Builder` (interface) — single contract: `build(): Query`. All concrete builders implement it.
- `QueryBuilder` — entry point; factory that constructs the four concrete builders (`select`, `insert`, `update`, `delete`) from a `TableDescription`.
- `SelectQueryBuilder` — richest builder; owns `where`, `join`, `groupBy`, `having`, `orderBy`, `limit`, `offset`, `returning`, `union`, `selectRaw`, `distinct`; delegates each concern to a dedicated internal clause builder.
- `InsertQueryBuilder` / `UpdateQueryBuilder` / `DeleteQueryBuilder` — write-path builders; `Update` and `Delete` accept an optional `onWarning` callback emitting `QueryBuilderWarning` (not an exception) when no `WHERE` clause is present.
- Internal clause builders (`ConditionBuilder`, `JoinClauseBuilder`, `OrderByClauseBuilder`, `GroupByClauseBuilder`, `LimitClauseBuilder`, `OffsetClauseBuilder`, `ReturningClauseBuilder`) — each holds mutable state and exposes `build()` / `isEmpty()`; used by the outer builders but not exported from `src/query-builder/index.ts` except `ConditionBuilder`.
- No dependency on drivers, metadata, or model layers; consumed by compilers in `src/drivers/` that traverse the `Query` AST.

## Key types & files

- `Query` (union) — `SelectQuery | InsertQuery | UpdateQuery | DeleteQuery` — `src/query-builder/types/query/Query.ts:21`
- `QueryCommon` — base with `type: QueryType` and `table: TableDescription` — `Query.ts:16`
- `SelectQuery` — full read AST; optional `unions`, `rawColumns`, `distinct`, `tableAlias` — `SelectQuery/SelectQuery.ts:12`
- `ConditionClause` (union) — `BaseCondition | ConditionGroup | RawCondition`; `connector?: LogicalOperator` links sibling conditions — `ConditionClause/ConditionClause.ts:34`
- `OnConflictClause` / `OnConflictUpdate` — INSERT upsert semantics (`do-nothing`, `all-non-conflict`, or column list) — `OnConflictClause/OnConflictClause.ts:10`
- `QueryBuilderError` — thrown by `build()` on invalid state (e.g. HAVING without GROUP BY, OFFSET without LIMIT, empty INSERT values) — `errors/QueryBuilderError.ts:1`
- `QueryBuilderWarning` — value object (not thrown) surfaced via `onWarning` callback for UPDATE/DELETE without WHERE — `errors/QueryBuilderWarning.ts:1`

## Public exports

`src/query-builder/index.ts` exports all builders, errors, query types, clause types, and common primitives — including backward-compatible aliases (`SelectBuilder`, `WhereBuilder`, etc.).

**The module is NOT re-exported from `src/index.ts`.** The root index exports `drivers`, `decorators`, `model`, and `metadata` only. Code using the query builder must import directly from `src/query-builder/` or via the path alias `@/query-builder/`.

## Dependencies

- No dependencies on other `src/` modules (`model`, `metadata`, `drivers`, `decorators`).
- Internal only: `types/` consumed by `builders/`; `errors/` consumed by concrete builders.

## Gotchas

- The `Query` AST is a plain data structure — no methods, no SQL. It is passed to dialect compilers (`QueryCompiler` and friends in `src/drivers/`) which traverse the tree to produce SQL strings and parameter arrays.
- `ConditionBuilder.build()` always wraps collected conditions in a `ConditionGroup`; the first condition in any group has no `connector` (the `nextConnector()` helper returns `undefined` when the list is empty), so compilers must handle a missing connector as the first predicate.
- `QueryBuilderError` is thrown (fail-fast); `QueryBuilderWarning` is only delivered if the caller registers `onWarning` — callers that omit the callback silently lose the warning.

## Tests

9 test files across 2 `__tests__` directories:
- `src/query-builder/builders/__tests__/`
- `src/query-builder/builders/internal/__tests__/`
