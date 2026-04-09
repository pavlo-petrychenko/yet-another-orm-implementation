import type { Builder } from "@/query-builder/builders/Builder";
import { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
import { JoinClauseBuilder } from "@/query-builder/builders/internal/JoinClauseBuilder";
import { GroupByClauseBuilder } from "@/query-builder/builders/internal/GroupByClauseBuilder";
import { OrderByClauseBuilder } from "@/query-builder/builders/internal/OrderByClauseBuilder";
import { LimitClauseBuilder } from "@/query-builder/builders/internal/LimitClauseBuilder";
import { OffsetClauseBuilder } from "@/query-builder/builders/internal/OffsetClauseBuilder";
import { ReturningClauseBuilder } from "@/query-builder/builders/internal/ReturningClauseBuilder";
import {
  QueryType,
  type SelectQuery,
  type ComparisonOperator,
  OrderDirection,
  JoinType,
} from "@/query-builder/types";
import type { TableDescription } from "@/query-builder/types/common/TableDescription";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import type { RawExpression } from "@/query-builder/types/common/RawExpression";

type ConditionValue = ColumnDescription | string | number | (string | number)[];

export class SelectQueryBuilder implements Builder {
  private _table: TableDescription;
  private _columns: ColumnDescription[] = [];
  private _rawColumns: RawExpression[] = [];
  private _distinct: boolean = false;
  private _unions: { query: SelectQuery; all: boolean }[] = [];
  private _whereBuilder: ConditionBuilder = new ConditionBuilder();
  private _havingBuilder: ConditionBuilder = new ConditionBuilder();
  private _joinBuilder: JoinClauseBuilder = new JoinClauseBuilder();
  private _groupByBuilder: GroupByClauseBuilder = new GroupByClauseBuilder();
  private _orderByBuilder: OrderByClauseBuilder = new OrderByClauseBuilder();
  private _limitBuilder: LimitClauseBuilder = new LimitClauseBuilder();
  private _offsetBuilder: OffsetClauseBuilder = new OffsetClauseBuilder();
  private _returningBuilder: ReturningClauseBuilder = new ReturningClauseBuilder();

  private _hasWhere = false;
  private _hasHaving = false;

  // --- Table + columns ---

  from(table: TableDescription): this {
    this._table = table;
    return this;
  }

  select(...columns: ColumnDescription[]): this {
    this._columns = columns;
    return this;
  }

  selectRaw(sql: string, params: any[] = []): this {
    this._rawColumns.push({ type: "raw", sql, params });
    return this;
  }

  distinct(enabled: boolean = true): this {
    this._distinct = enabled;
    return this;
  }

  // --- WHERE ---

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

  andWhere(column: ColumnDescription, operator: ComparisonOperator, value?: ConditionValue): this {
    this._hasWhere = true;
    this._whereBuilder.andWhere(column, operator, value as ConditionValue);
    return this;
  }

  orWhere(column: ColumnDescription, operator: ComparisonOperator, value?: ConditionValue): this {
    this._hasWhere = true;
    this._whereBuilder.orWhere(column, operator, value as ConditionValue);
    return this;
  }

  // --- JOIN ---

  join(table: TableDescription, on: (builder: ConditionBuilder) => void): this {
    this._joinBuilder.add(JoinType.INNER, table, on);
    return this;
  }

  leftJoin(table: TableDescription, on: (builder: ConditionBuilder) => void): this {
    this._joinBuilder.add(JoinType.LEFT, table, on);
    return this;
  }

  rightJoin(table: TableDescription, on: (builder: ConditionBuilder) => void): this {
    this._joinBuilder.add(JoinType.RIGHT, table, on);
    return this;
  }

  fullJoin(table: TableDescription, on: (builder: ConditionBuilder) => void): this {
    this._joinBuilder.add(JoinType.FULL, table, on);
    return this;
  }

  crossJoin(table: TableDescription): this {
    this._joinBuilder.add(JoinType.CROSS, table);
    return this;
  }

  // --- GROUP BY / HAVING ---

  groupBy(...columns: ColumnDescription[]): this {
    this._groupByBuilder.add(...columns);
    return this;
  }

  having(callback: (builder: ConditionBuilder) => void): this;
  having(column: ColumnDescription, operator: ComparisonOperator, value?: ConditionValue): this;
  having(
    columnOrCallback: ColumnDescription | ((builder: ConditionBuilder) => void),
    operator?: ComparisonOperator,
    value?: ConditionValue,
  ): this {
    this._hasHaving = true;
    if (typeof columnOrCallback === "function") {
      columnOrCallback(this._havingBuilder);
    } else {
      this._havingBuilder.where(columnOrCallback, operator as ComparisonOperator, value as ConditionValue);
    }
    return this;
  }

  // --- ORDER BY / LIMIT / OFFSET ---

  orderBy(column: ColumnDescription, direction: OrderDirection = OrderDirection.ASC): this {
    this._orderByBuilder.add(column, direction);
    return this;
  }

  limit(count: number): this {
    this._limitBuilder.set(count);
    return this;
  }

  offset(count: number): this {
    this._offsetBuilder.set(count);
    return this;
  }

  // --- RETURNING ---

  returning(...columns: ColumnDescription[]): this {
    this._returningBuilder.set(...columns);
    return this;
  }

  // --- UNION ---

  union(query: SelectQuery | SelectQueryBuilder, all: boolean = false): this {
    const resolved = query instanceof SelectQueryBuilder ? query.build() : query;
    this._unions.push({ query: resolved, all });
    return this;
  }

  unionAll(query: SelectQuery | SelectQueryBuilder): this {
    return this.union(query, true);
  }

  // --- Build ---

  build(): SelectQuery {
    const query: SelectQuery = {
      type: QueryType.SELECT,
      table: this._table,
      columns: this._columns,
    };

    if (this._distinct) query.distinct = true;
    if (this._table.alias) query.tableAlias = this._table.alias;
    if (this._rawColumns.length) query.rawColumns = this._rawColumns;

    if (this._hasWhere) {
      query.where = this._whereBuilder.build();
    }

    if (!this._joinBuilder.isEmpty()) query.join = this._joinBuilder.build();
    if (!this._groupByBuilder.isEmpty()) query.groupBy = this._groupByBuilder.build();

    if (this._hasHaving) {
      query.having = this._havingBuilder.build();
    }

    if (!this._orderByBuilder.isEmpty()) query.orderBy = this._orderByBuilder.build();
    if (!this._limitBuilder.isEmpty()) query.limit = this._limitBuilder.build();
    if (!this._offsetBuilder.isEmpty()) query.offset = this._offsetBuilder.build();
    if (!this._returningBuilder.isEmpty()) query.returning = this._returningBuilder.build();

    if (this._unions.length) query.unions = this._unions;

    return query;
  }
}
