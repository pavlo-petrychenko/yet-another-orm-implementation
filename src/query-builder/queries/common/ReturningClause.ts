import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
/**
 * Represents a RETURNING clause in a SQL query, which specifies which columns should be returned
 * after an INSERT, UPDATE, or DELETE operation (commonly used in PostgreSQL).
 */
export interface ReturningClause {
    /**
     * The type identifier for this clause.
     */
    type: "returning";

    /**
     * An array of columns to be returned from the query.
     */
    columns: ColumnDescription[];
}