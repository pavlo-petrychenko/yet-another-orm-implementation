import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import {QueryCommon} from "@/query-builder/queries/Query";
import {RawExpression} from "@/query-builder/queries/common/RawExpression";


/**
 * Represents a SQL SELECT query.
 *
 * Extends the common query interface with a list of columns to retrieve.
 */
export interface SelectQuery extends QueryCommon {
    /**
     * Specifies the type of query. Must be 'SELECT'.
     */
    type: 'SELECT';
    /**
     * List of columns to select in the query.
     * If the array is empty, a wildcard (*) is typically used.
     */
    columns: ColumnDescription[];
    /**
     * Whether to use SELECT DISTINCT.
     */
    distinct?: boolean;
    /**
     * Optional alias for the main table (e.g., FROM users AS u).
     */
    tableAlias?: string;
    /**
     * Raw SQL expressions to include in the SELECT column list.
     */
    rawColumns?: RawExpression[];
    /**
     * UNION/UNION ALL queries to append after this SELECT.
     */
    unions?: { query: SelectQuery; all: boolean }[];
}
