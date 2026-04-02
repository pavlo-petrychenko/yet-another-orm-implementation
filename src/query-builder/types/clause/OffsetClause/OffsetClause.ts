import {Clause, ClauseType} from "@/query-builder/types/clauses/Clause";

export interface OffsetClause extends Clause {
  type: ClauseType.Offset;
  count: number;
}
