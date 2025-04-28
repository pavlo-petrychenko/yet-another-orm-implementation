import {QueryCommon} from "@/query-builder/queries/Query";
import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";

export interface DeleteQuery extends QueryCommon {
    type: 'DELETE';
}
