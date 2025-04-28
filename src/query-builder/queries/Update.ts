import {QueryCommon} from "@/query-builder/queries/Query";


export interface UpdateQuery extends QueryCommon {
    type: 'UPDATE';
    values: Record<string, any>;
}
