# Task: Cleanup Old Skeletal Stubs

## Scope
Delete the old non-functional builder files and directories that are replaced by the new implementations.

## Dependencies
- All other tasks complete
- `npx tsc --noEmit` passes with new builders
- No remaining imports reference these files

## Files/directories to delete

### Old query builder stubs
- `src/query-builder/builders/QueryBuilder/Builder.ts`
- `src/query-builder/builders/QueryBuilder/SelectBuilder/SelectBuilder.ts`
- `src/query-builder/builders/QueryBuilder/InsertBuilder/InsertBuilder.ts`
- `src/query-builder/builders/QueryBuilder/UpdateBuilder/UpdateBuilder.ts`
- `src/query-builder/builders/QueryBuilder/DeleteBuilder/DeleteBuilder.ts`
- Remove empty directories: `src/query-builder/builders/QueryBuilder/` (entire subtree)

### Old clause builder stubs
- `src/query-builder/builders/ClauseBuilder/ClauseBuilder.ts`
- `src/query-builder/builders/ClauseBuilder/WhereBuilder/WhereBuilder.ts`
- `src/query-builder/builders/ClauseBuilder/JoinBuilder/JoinBuilder.ts`
- `src/query-builder/builders/ClauseBuilder/GroupByBuilder/GroupByBuilder.ts`
- `src/query-builder/builders/ClauseBuilder/OrderByBuilder/OrderByBuilder.ts`
- `src/query-builder/builders/ClauseBuilder/LimitBuilder/LimitBuilder.ts`
- `src/query-builder/builders/ClauseBuilder/OffsetBuilder/OffsetBuilder.ts`
- `src/query-builder/builders/ClauseBuilder/ReturningBuilder/ReturningBuilder.ts`
- Remove empty directories: `src/query-builder/builders/ClauseBuilder/` (entire subtree)

## Verification
- No import in the project references any deleted file
- `npx tsc --noEmit` still passes
- `npm test` still passes

_DONE
