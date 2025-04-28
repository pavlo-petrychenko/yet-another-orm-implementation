import {QueryCommon} from "@/query-builder/queries/Query";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

export interface SelectQuery extends QueryCommon {
    type: 'SELECT';
    columns: ColumnDescription[];
}
