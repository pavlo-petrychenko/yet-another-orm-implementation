import {Clause, ClauseType} from "@/query-builder/types/clause/Clause";

export interface OffsetClause extends Clause {
  type: ClauseType.Offset;
  count: number;
}
