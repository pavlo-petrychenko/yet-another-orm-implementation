import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

export interface BaseCondition {
    type: "condition";
    left: ColumnDescription; // column or expression
    operator: ComparisonOperator;
    right: ColumnDescription | ColumnDescription[] | string | number | (string | number)[]; // value or column(s)
    isColumnComparison?: boolean; // optional: true if `right` is also a column
    connector?: LogicalOperator;
}

export interface ConditionGroup {
    type: "group";
    conditions: ConditionClause[];
    connector?: LogicalOperator; // how this group connects to previous one
}

// A union type for any condition clause
export type ConditionClause = BaseCondition | ConditionGroup;

export type ComparisonOperator =
    | "="
    | "<>"
    | ">"
    | "<"
    | ">="
    | "<="
    | "IN"
    | "NOT IN";

export type LogicalOperator = "AND" | "OR" | "AND NOT" | "OR NOT";