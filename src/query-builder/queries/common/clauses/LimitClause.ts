/**
 * Represents a LIMIT clause in a SQL query, restricting the number of returned rows.
 */

export interface LimitClause {
    /**
     * The type identifier for this clause.
     */
    type: "limit";
    /**
     * The maximum number of rows to return.
     */
    count: number;
}