import {QueryCommon} from "@/query-builder/queries/Query";
/**
 * Represents a SQL UPDATE query.
 *
 * Extends the common query interface with the fields to be updated.
 */

export interface UpdateQuery extends QueryCommon {
    /**
     * Specifies the type of query. Must be 'UPDATE'.
     */
    type: 'UPDATE';
    /**
     * A key-value map of column names and their new values.
     * Each key represents a column to be updated, and the value is the new value to assign.
     */
    values: Record<string, any>;
}
