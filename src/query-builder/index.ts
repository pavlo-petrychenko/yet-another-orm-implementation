// Builders
export { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
export { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
export { InsertQueryBuilder } from "@/query-builder/builders/InsertQueryBuilder";
export { UpdateQueryBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
export { DeleteQueryBuilder } from "@/query-builder/builders/DeleteQueryBuilder";
export { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";

// Errors
export { QueryBuilderError } from "@/query-builder/errors/QueryBuilderError";
export { QueryBuilderWarning } from "@/query-builder/errors/QueryBuilderWarning";

// Backward-compatible aliases
export { SelectQueryBuilder as SelectBuilder } from "@/query-builder/builders/SelectQueryBuilder";
export { InsertQueryBuilder as InsertBuilder } from "@/query-builder/builders/InsertQueryBuilder";
export { UpdateQueryBuilder as UpdateBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
export { DeleteQueryBuilder as DeleteBuilder } from "@/query-builder/builders/DeleteQueryBuilder";
export { ConditionBuilder as WhereBuilder } from "@/query-builder/builders/internal/ConditionBuilder";

// Query types
export { QueryType, Query, QueryCommon } from "@/query-builder/types";
export { SelectQuery, InsertQuery, UpdateQuery, DeleteQuery } from "@/query-builder/types";

// Common types
export { ColumnDescription } from "@/query-builder/types";
export { RawExpression } from "@/query-builder/types";
export { ScalarParam } from "@/query-builder/types";

// Clause types
export {
  ComparisonOperator,
  LogicalOperator,
  BaseCondition,
  ConditionGroup,
  RawCondition,
  ConditionClause,
  ConditionType,
  Clause,
  ClauseType,
  JoinType,
  JoinClause,
  GroupByClause,
  OrderDirection,
  OrderByClause,
  LimitClause,
  OffsetClause,
  ReturningClause,
  TableDescription,
  OnConflictClause,
  OnConflictUpdate,
} from "@/query-builder/types";
