import {ConditionClause} from "@/query-builder/queries/common/clauses/WhereClause";

/**
 * Possible types of SQL JOIN operations.
 */
export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL" | "CROSS";

/**
 * Represents a JOIN clause in a SQL query.
 */
export interface JoinClause {
    /**
     * The type of join (e.g., INNER, LEFT, RIGHT, FULL, CROSS).
     */
    type: JoinType,
    /**
     * The name of the table to join.
     */
    table: string,
    /**
     * Optional alias for the joined table.
     */
    alias?: string,
    /**
     * The join condition expressed as a WHERE-like clause.
     * Optional for CROSS JOIN.
     */
    on?: ConditionClause,
}
