import { type ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import { type OrderByClause } from "@/query-builder/types/clause/OrderByClause/OrderByClause";
import { type OrderDirection } from "@/query-builder/types/common/OrderDirection";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class OrderByClauseBuilder {
  private orders: { column: ColumnDescription; direction: OrderDirection }[] = [];

  add(column: ColumnDescription, direction: OrderDirection): void {
    this.orders.push({ column, direction });
  }

  isEmpty(): boolean {
    return this.orders.length === 0;
  }

  build(): OrderByClause {
    return {
      type: ClauseType.OrderBy,
      orders: this.orders,
    };
  }
}
