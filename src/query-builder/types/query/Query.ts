import {
  DeleteQuery,
  InsertQuery,
  SelectQuery,
  TableDescription,
  UpdateQuery,
} from "@/query-builder/types";

export enum QueryType {
  SELECT = "SELECT",
  INSERT = "INSERT",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export interface QueryCommon {
  type: QueryType;
  table: TableDescription;
}

export type Query = SelectQuery | InsertQuery | UpdateQuery | DeleteQuery;
