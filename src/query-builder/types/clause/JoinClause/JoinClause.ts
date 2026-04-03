import { Clause, ClauseType } from "@/query-builder/types/clause/Clause";
import { ConditionClause } from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import { JoinType } from "@/query-builder/types/clause/JoinClause/typedefs";
import { TableDescription } from "@/query-builder/types/common/TableDescription";

export interface JoinClause extends Clause {
  type: ClauseType.Join;
  joinType: JoinType;
  table: TableDescription;
  on?: ConditionClause;
}
