import {SelectQuery} from "@/query-builder/types/query/SelectQuery/SelectQuery";
import {InsertQuery} from "@/query-builder/types/query/InsertQuery/InsertQuery";
import {UpdateQuery} from "@/query-builder/types/query/UpdateQuery/UpdateQuery";
import {DeleteQuery} from "@/query-builder/types/query/DeleteQuery/DeleteQuery";

export enum QueryType {
  SELECT = "SELECT",
  INSERT = "INSERT",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export interface QueryCommon {
  type: QueryType;
  table: string;
}

export type Query = SelectQuery | InsertQuery | UpdateQuery | DeleteQuery;
