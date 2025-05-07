// import {QueryCommon} from "@/query-builder/queries/Query";
// import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";
// import {QueryCommon} from "query-builder/queries/Query";

import {QueryCommon} from "./Query";

/**
 * Represents an INSERT SQL query structure.
 *
 * Extends `QueryCommon` with properties specific to an insert operation.
 */
export interface InsertQuery extends QueryCommon{
    /** Indicates the query type is INSERT. */
    type: 'INSERT';
    /** Indicates the query type is INSERT. */
    values: Record<string, any>;
}
