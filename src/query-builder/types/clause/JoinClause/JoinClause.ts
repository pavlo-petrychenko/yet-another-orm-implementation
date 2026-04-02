import {Clause, ClauseType} from "@/query-builder/types/clauses/Clause";
import {ConditionClause} from "@/query-builder/types/clauses/ConditionClause/ConditionClause";
import {JoinType} from "@/query-builder/types/clauses/JoinClause/typedefs";

export interface JoinClause extends Clause {
  type: ClauseType.Join;
  joinType: JoinType;
  table: string;
  alias?: string;
  on?: ConditionClause;
}
