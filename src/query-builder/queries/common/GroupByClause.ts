// import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

// import {ColumnDescription} from "query-builder/queries/common/ColumnDecription";

import {ColumnDescription} from "./ColumnDecription";

/**
 * Represents the GROUP BY clause of a SQL query.
 * Used to group rows that have the same values in specified columns.
 */
export interface GroupByClause {
    /**
     * Clause type identifier.
     */
    type: "group_by";
    /**
     * Clause type identifier.
     */
    columns: ColumnDescription[];
}