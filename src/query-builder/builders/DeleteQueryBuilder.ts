import type { Builder } from "@/query-builder/builders/Builder";
import { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
import { OrderByClauseBuilder } from "@/query-builder/builders/internal/OrderByClauseBuilder";
import { LimitClauseBuilder } from "@/query-builder/builders/internal/LimitClauseBuilder";
import { ReturningClauseBuilder } from "@/query-builder/builders/internal/ReturningClauseBuilder";
import { QueryBuilderWarning } from "@/query-builder/errors/QueryBuilderWarning";
import { QueryType, type DeleteQuery, type ComparisonOperator, OrderDirection } from "@/query-builder/types";
import type { TableDescription } from "@/query-builder/types/common/TableDescription";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";

type ConditionValue = ColumnDescription | ScalarParam | ScalarParam[];

export class DeleteQueryBuilder implements Builder {
  private _table: TableDescription;
  private _whereBuilder: ConditionBuilder = new ConditionBuilder();
  private _orderByBuilder: OrderByClauseBuilder = new OrderByClauseBuilder();
  private _limitBuilder: LimitClauseBuilder = new LimitClauseBuilder();
  private _returningBuilder: ReturningClauseBuilder = new ReturningClauseBuilder();

  private _hasWhere = false;
  private _onWarning?: (warning: QueryBuilderWarning) => void;

  constructor({ table }: { table: TableDescription }) {
    this._table = table;
  }

  onWarning(callback: (warning: QueryBuilderWarning) => void): this {
    this._onWarning = callback;
    return this;
  }

  where(callback: (builder: ConditionBuilder) => void): this;
  where(column: ColumnDescription, operator: ComparisonOperator, value?: ConditionValue): this;
  where(
    columnOrCallback: ColumnDescription | ((builder: ConditionBuilder) => void),
    operator?: ComparisonOperator,
    value?: ConditionValue,
  ): this {
    this._hasWhere = true;
    if (typeof columnOrCallback === "function") {
      columnOrCallback(this._whereBuilder);
    } else {
      this._whereBuilder.where(columnOrCallback, operator as ComparisonOperator, value as ConditionValue);
    }
    return this;
  }

  orderBy(column: ColumnDescription, direction: OrderDirection = OrderDirection.ASC): this {
    this._orderByBuilder.add(column, direction);
    return this;
  }

  limit(count: number): this {
    this._limitBuilder.set(count);
    return this;
  }

  returning(...columns: ColumnDescription[]): this {
    this._returningBuilder.set(...columns);
    return this;
  }

  build(): DeleteQuery {
    if (!this._hasWhere && this._onWarning) {
      this._onWarning(
        new QueryBuilderWarning("DeleteQueryBuilder", "DELETE without WHERE will affect all rows")
      );
    }

    const query: DeleteQuery = {
      type: QueryType.DELETE,
      table: this._table,
    };

    if (this._hasWhere) {
      query.where = this._whereBuilder.build();
    }

    if (!this._orderByBuilder.isEmpty()) query.orderBy = this._orderByBuilder.build();
    if (!this._limitBuilder.isEmpty()) query.limit = this._limitBuilder.build();
    if (!this._returningBuilder.isEmpty()) query.returning = this._returningBuilder.build();

    return query;
  }
}
