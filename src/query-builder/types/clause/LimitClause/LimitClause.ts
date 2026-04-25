import {type Clause, type ClauseType} from "@/query-builder/types/clause/Clause";

export interface LimitClause extends Clause {
  type: ClauseType.Limit;
  count: number;
}
