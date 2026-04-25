import { type Clause, type ClauseType } from "@/query-builder/types/clause/Clause";
import { type ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";
import {type ColumnDescription} from "@/query-builder/types/common/ColumnDescription";
import {type ComparisonOperator} from "@/query-builder/types/common/ComparisonOperator";
import {type LogicalOperator} from "@/query-builder/types/common/LogicalOperator";
import { type ScalarParam } from "@/query-builder/types/common/ScalarParam";
import type {SelectQuery} from "@/query-builder/types/query/SelectQuery/SelectQuery";

export interface BaseCondition extends Clause {
  type: ClauseType.Condition;
  conditionType: ConditionType.Base;
  left: ColumnDescription;
  operator: ComparisonOperator;
  right: ColumnDescription | ColumnDescription[] | ScalarParam | ScalarParam[] | SelectQuery;
  isColumnComparison?: boolean;
  connector?: LogicalOperator;
}

export interface ConditionGroup extends Clause {
  type: ClauseType.Condition;
  conditionType: ConditionType.Group;
  conditions: ConditionClause[];
  connector?: LogicalOperator;
}

export interface RawCondition extends Clause {
  type: ClauseType.Condition;
  conditionType: ConditionType.Raw;
  sql: string;
  params: any[];
  connector?: LogicalOperator;
}

export type ConditionClause = BaseCondition | ConditionGroup | RawCondition;
