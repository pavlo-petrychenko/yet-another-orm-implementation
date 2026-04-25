import { type Clause, type ClauseType } from "@/query-builder/types/clause/Clause";
import { type ConditionClause } from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import { type JoinType } from "@/query-builder/types/clause/JoinClause/typedefs";
import { type TableDescription } from "@/query-builder/types/common/TableDescription";

export interface JoinClause extends Clause {
  type: ClauseType.Join;
  joinType: JoinType;
  table: TableDescription;
  on?: ConditionClause;
}
