import {Clause, ClauseType} from "@/query-builder/types/clauses/Clause";

export interface LimitClause extends Clause {
  type: ClauseType.Limit;
  count: number;
}
