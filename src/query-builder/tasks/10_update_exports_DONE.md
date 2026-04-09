# Task: Update Module Exports

## Scope
Rewrite `src/query-builder/index.ts` to export all builders and types. Add backward-compatible aliases for old import names.

## File to modify
`src/query-builder/index.ts`

## Dependencies
- All builder tasks (02-09)
- Task 01 (type imports fixed)

## Exports structure

### Builders (primary public API)
```typescript
export { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
export { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
export { InsertQueryBuilder } from "@/query-builder/builders/InsertQueryBuilder";
export { UpdateQueryBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
export { DeleteQueryBuilder } from "@/query-builder/builders/DeleteQueryBuilder";
export { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
```

### Backward-compatible aliases
```typescript
export { SelectQueryBuilder as SelectBuilder } from "@/query-builder/builders/SelectQueryBuilder";
export { InsertQueryBuilder as InsertBuilder } from "@/query-builder/builders/InsertQueryBuilder";
export { UpdateQueryBuilder as UpdateBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
export { DeleteQueryBuilder as DeleteBuilder } from "@/query-builder/builders/DeleteQueryBuilder";
export { ConditionBuilder as WhereBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
```

### Query types (Dialect contract — preserved)
```typescript
export { QueryType, Query, QueryCommon } from "@/query-builder/types";
export { SelectQuery, InsertQuery, UpdateQuery, DeleteQuery } from "@/query-builder/types";
```

### Clause types + common types (all existing exports preserved)
All current clause/common type exports remain as-is.

## Verification
- `npx tsc --noEmit` passes
- All imports from `@/query-builder` used elsewhere in the project resolve
