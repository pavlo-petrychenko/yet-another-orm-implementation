import {type ReturningClause} from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import { type QueryCommon, type QueryType } from "@/query-builder/types/query/Query";

export interface InsertQuery extends QueryCommon {
  type: QueryType.INSERT;
  values: Record<string, any>[];
  returning?: ReturningClause;
}
