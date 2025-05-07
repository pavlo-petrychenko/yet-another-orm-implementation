// import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

// import {ColumnDescription} from "query-builder/queries/common/ColumnDecription";

import {ColumnDescription} from "./ColumnDecription";

/**
 * Represents a basic comparison condition in a SQL WHERE clause.
 */
export interface BaseCondition {
    /** Type identifier for the clause. */
    type: "condition";
    /** Left-hand side of the condition, typically a column or expression. */
    left: ColumnDescription;


    /** Comparison operator (e.g., =, <>, IN). */
    operator: ComparisonOperator;
    /**
     * Right-hand side of the condition.
     * Can be a single value, column, or array of values/columns (for IN / NOT IN).
     */
    right: ColumnDescription | ColumnDescription[] | string | number | (string | number)[]; // value or column(s)
    /**
     * Optional flag to indicate whether the right-hand side is also a column (column-to-column comparison).
     */
    isColumnComparison?: boolean; // optional: true if `right` is also a column
    /**
     * Optional logical connector to the previous condition (e.g., AND, OR).
     */
    connector?: LogicalOperator;
}

/**
 * Represents a group of conditions, allowing for nested logical expressions.
 */
export interface ConditionGroup {
    /** Type identifier for the clause. */
    type: "group";
    /** Array of inner condition clauses (can be nested). */
    conditions: ConditionClause[];
    /** Optional logical connector for combining with other groups or conditions. */
    connector?: LogicalOperator; // how this group connects to previous one
}

/**
 * Union type representing any type of condition clause: basic or grouped.
 */
// A union type for any condition clause
export type ConditionClause = BaseCondition | ConditionGroup;
/**
 * Supported SQL comparison operators.
 */
export type ComparisonOperator =
    | "="
    | "<>"
    | ">"
    | "<"
    | ">="
    | "<="
    | "IN"
    | "NOT IN";
/**
 * Supported SQL logical operators used to connect conditions.
 */
export type LogicalOperator = "AND" | "OR" | "AND NOT" | "OR NOT";