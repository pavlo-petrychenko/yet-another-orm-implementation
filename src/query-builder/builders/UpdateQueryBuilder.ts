import type { Builder } from "@/query-builder/builders/Builder";
import { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
import { OrderByClauseBuilder } from "@/query-builder/builders/internal/OrderByClauseBuilder";
import { LimitClauseBuilder } from "@/query-builder/builders/internal/LimitClauseBuilder";
import { ReturningClauseBuilder } from "@/query-builder/builders/internal/ReturningClauseBuilder";
import { QueryBuilderError } from "@/query-builder/errors/QueryBuilderError";
import { QueryBuilderWarning } from "@/query-builder/errors/QueryBuilderWarning";
import { QueryType, OrderDirection, type UpdateQuery, type ComparisonOperator } from "@/query-builder/types";
import type { TableDescription } from "@/query-builder/types/common/TableDescription";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";

type ConditionValue = ColumnDescription | string | number | (string | number)[];

export class UpdateQueryBuilder implements Builder {
  private _table: TableDescription;
  private _values: Record<string, any> = {};
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

  set(values: Record<string, any>): this {
    Object.assign(this._values, values);
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
    } else if (operator !== undefined && value !== undefined) {
      this._whereBuilder.where(columnOrCallback, operator, value);
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

  build(): UpdateQuery {
    const errors: string[] = [];
    if (Object.keys(this._values).length === 0) {
      errors.push("set() is required: no values specified for UPDATE query");
    }
    if (errors.length > 0) {
      throw new QueryBuilderError("UpdateQueryBuilder", errors);
    }

    if (!this._hasWhere && this._onWarning) {
      this._onWarning(
        new QueryBuilderWarning("UpdateQueryBuilder", "UPDATE without WHERE will affect all rows")
      );
    }

    const query: UpdateQuery = {
      type: QueryType.UPDATE,
      table: this._table,
      values: this._values,
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
