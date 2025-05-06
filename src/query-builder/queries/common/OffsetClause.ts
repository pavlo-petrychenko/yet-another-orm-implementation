
/**
 * Represents an OFFSET clause in a SQL query, skipping a specified number of rows before returning results.
 */

export interface OffsetClause {
    /**
     * The type identifier for this clause.
     */
    type: "offset";
    /**
     * The number of rows to skip.
     */
    count: number;
}