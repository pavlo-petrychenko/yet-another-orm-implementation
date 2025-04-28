import {SelectQuery} from "@/query-builder/queries/Select";
import {InsertQuery} from "@/query-builder/queries/Insert";
import {UpdateQuery} from "@/query-builder/queries/Update";
import {DeleteQuery} from "@/query-builder/queries/Delete";
import {QueryDescription} from "@/query-builder/queries/common/CommonQueryDescription";


export interface QueryCommon extends QueryDescription{
    type : "SELECT" | "INSERT" | "UPDATE" | "DELETE";
    table : string;
}


export type Query = SelectQuery | InsertQuery | UpdateQuery | DeleteQuery;
