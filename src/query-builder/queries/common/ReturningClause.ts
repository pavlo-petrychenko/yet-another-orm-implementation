import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

export interface ReturningClause {
    type: "returning";
    columns: ColumnDescription[];
}