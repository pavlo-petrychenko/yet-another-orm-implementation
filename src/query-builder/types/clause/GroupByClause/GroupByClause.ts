import {Clause, ClauseType} from "@/query-builder/types/clause/Clause";
import {ColumnDescription} from "@/query-builder/types/common/ColumnDescription";

export interface GroupByClause extends Clause {
  type: ClauseType.GroupBy;
  columns: ColumnDescription[];
}
