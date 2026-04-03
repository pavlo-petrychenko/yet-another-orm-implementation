import {Clause, ClauseType} from "@/query-builder/types/clauses/Clause";
import {ColumnDescription} from "@/query-builder/types/common/ColumnDescription";

export interface ReturningClause extends Clause {
  type: ClauseType.Returning;
  columns: ColumnDescription[];
}
