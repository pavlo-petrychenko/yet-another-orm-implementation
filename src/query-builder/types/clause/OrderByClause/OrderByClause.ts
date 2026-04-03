import {Clause, ClauseType} from "@/query-builder/types/clauses/Clause";
import {ColumnDescription} from "@/query-builder/types/common/ColumnDescription";
import {OrderDirection} from "@/query-builder/types/common/OrderDirection";

export interface OrderByClause extends Clause {
  type: ClauseType.OrderBy;
  orders: {column: ColumnDescription; direction: OrderDirection}[];
}
