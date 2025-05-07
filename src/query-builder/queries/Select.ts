// import {QueryCommon} from "@/query-builder/queries/Query";
// import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
// import {QueryCommon} from "query-builder/queries/Query";
// import {ColumnDescription} from "query-builder/queries/common/ColumnDecription";

import { ColumnDescription } from "./common/ColumnDecription";
import { QueryCommon } from "./Query";


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
}
