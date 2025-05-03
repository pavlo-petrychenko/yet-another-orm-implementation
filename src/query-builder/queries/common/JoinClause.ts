import {ConditionClause} from "@/query-builder/queries/common/WhereClause";
/**
 * Possible types of SQL JOIN operations.
 */
export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";
/**
 * Represents a JOIN clause in a SQL query.
 */
export interface JoinClause {
    /**
     * The type of join (e.g., INNER, LEFT, RIGHT, FULL).
     */
    type : JoinType,
    /**
     * The name of the table to join.
     */
    table: string,
    /**
     * The join condition expressed as a WHERE-like clause.
     */
    on: ConditionClause,
}