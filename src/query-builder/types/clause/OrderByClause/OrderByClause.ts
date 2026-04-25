import {type Clause, type ClauseType} from "@/query-builder/types/clause/Clause";
import {type ColumnDescription} from "@/query-builder/types/common/ColumnDescription";
import {type OrderDirection} from "@/query-builder/types/common/OrderDirection";

export interface OrderByClause extends Clause {
  type: ClauseType.OrderBy;
  orders: {column: ColumnDescription; direction: OrderDirection}[];
}
