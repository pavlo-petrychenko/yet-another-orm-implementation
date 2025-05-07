// import {QueryCommon} from "@/query-builder/queries/Query";
// import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";
// import {QueryCommon} from "query-builder/queries/Query";

import {QueryCommon} from "./Query";

/**
 * Represents a DELETE SQL query structure.
 *
 * Extends `QueryCommon` with a fixed `type` field indicating
 * that this query performs a deletion from a database table.
 */
export interface DeleteQuery extends QueryCommon {
    /** Indicates the query type is DELETE. */
    type: 'DELETE';
}
