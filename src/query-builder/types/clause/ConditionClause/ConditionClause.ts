import { Clause, ClauseType } from "@/query-builder/types/clause/Clause";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";
import {ColumnDescription} from "@/query-builder/types/common/Column";
import {ComparisonOperator} from "@/query-builder/types/common/ComparisonOperator";
import {LogicalOperator} from "@/query-builder/types/common/LogicalOperator";
import type {SelectQuery} from "@/query-builder/types/query/SelectQuery/SelectQuery";

export interface BaseCondition extends Clause {
  type: ClauseType.Condition;
  conditionType: ConditionType.Base;
  left: ColumnDescription;
  operator: ComparisonOperator;
  right: ColumnDescription | ColumnDescription[] | string | number | (string | number)[] | SelectQuery | null;
  isColumnComparison?: boolean;
  connector?: LogicalOperator;
}

export interface ConditionGroup {
  type: ClauseType.Condition;
  conditionType: ConditionType.Group;
  conditions: ConditionClause[];
  connector?: LogicalOperator;
}

export interface RawCondition {
  type: ClauseType.Condition;
  conditionType: ConditionType.Raw;
  sql: string;
  params: any[];
  connector?: LogicalOperator;
}

export type ConditionClause = BaseCondition | ConditionGroup | RawCondition;
