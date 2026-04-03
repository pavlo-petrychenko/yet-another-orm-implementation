import {ReturningClause} from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import { QueryCommon, QueryType } from "@/query-builder/types/query/Query";

export interface InsertQuery extends QueryCommon {
  type: QueryType.INSERT;
  values: Record<string, any>[];
  returning?: ReturningClause;
}
