import {Clause, ClauseType} from "@/query-builder/types/clauses/Clause";
import {ColumnDescription} from "@/query-builder/types/common/Column";

export interface GroupByClause extends Clause {
  type: ClauseType.GroupBy;
  columns: ColumnDescription[];
}
