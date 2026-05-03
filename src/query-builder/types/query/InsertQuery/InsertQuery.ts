import {type ReturningClause} from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import {type OnConflictClause} from "@/query-builder/types/clause/OnConflictClause/OnConflictClause";
import { type QueryCommon, type QueryType } from "@/query-builder/types/query/Query";

export interface InsertQuery extends QueryCommon {
  type: QueryType.INSERT;
  values: Record<string, any>[];
  returning?: ReturningClause;
  onConflict?: OnConflictClause;
}
