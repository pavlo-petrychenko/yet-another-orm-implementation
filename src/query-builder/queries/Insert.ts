import {QueryCommon, QueryType} from "@/query-builder/queries/Query";

/**
 * Represents an INSERT SQL query structure.
 *
 * Extends `QueryCommon` with properties specific to an insert operation.
 */
export interface InsertQuery extends QueryCommon{
    /** Indicates the query type is INSERT. */
    type: QueryType.INSERT;
    /** The column-value pairs to insert (single record or batch). */
    values: Record<string, any> | Record<string, any>[];
}
