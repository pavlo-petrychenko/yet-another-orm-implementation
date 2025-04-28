import {QueryCommon} from "@/query-builder/queries/Query";
import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";

export interface InsertQuery extends QueryCommon{
    type: 'INSERT';
    values: Record<string, any>;
}
