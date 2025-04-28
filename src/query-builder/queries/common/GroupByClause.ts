import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

export interface GroupByClause {
    type: "group_by";
    columns: ColumnDescription[];
}