# ~~Task: Fix Broken Clause Type Imports~~ FIXED

## Scope
Fix 5 clause type files that import from a non-existent path `@/query-builder/types/clauses/Clause` (plural). The actual path is `@/query-builder/types/clause/Clause` (singular).

## Files to modify
- `src/query-builder/types/clause/GroupByClause/GroupByClause.ts`
- `src/query-builder/types/clause/OrderByClause/OrderByClause.ts`
- `src/query-builder/types/clause/LimitClause/LimitClause.ts`
- `src/query-builder/types/clause/OffsetClause/OffsetClause.ts`
- `src/query-builder/types/clause/ReturningClause/ReturningClause.ts`

## Change
In each file, replace:
```
@/query-builder/types/clauses/Clause
```
with:
```
@/query-builder/types/clause/Clause
```

## Dependencies
None — this is a prerequisite for all other tasks.

## Verification
- `npx tsc --noEmit` passes for these files
- All clause type re-exports from `types/clause/index.ts` resolve
