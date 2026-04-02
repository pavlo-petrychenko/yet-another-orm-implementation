import {WhereBuilder} from "@/query-builder/builders/WhereBuilder";
import {GroupByBuilder} from "@/query-builder/builders/internal/GroupByBuilder";
import {OrderByBuilder} from "@/query-builder/builders/internal/OrderByBuilder";
import {LimitBuilder} from "@/query-builder/builders/internal/LimitBuilder";
import {OffsetBuilder} from "@/query-builder/builders/internal/OffsetBuilder";
import {JoinBuilder} from "@/query-builder/builders/internal/JoinBuilder";
import {OrderDirection} from "@/query-builder/types/common/OrderDirection";
import {QueryDescription} from "@/query-builder/types/QueryDescription";
import {ColumnDescription} from "@/query-builder/types/common/Column";
import {ClauseType} from "@/query-builder/types/clause/Clause";

export abstract class ClauseMixin {
  protected whereBuilder = new WhereBuilder();
  protected groupByBuilder = new GroupByBuilder();
  protected orderByBuilder = new OrderByBuilder();
  protected limitBuilder = new LimitBuilder();
  protected offsetBuilder = new OffsetBuilder();
  protected joinBuilder = new JoinBuilder();
  protected havingBuilder = new WhereBuilder();
  private returningColumns: ColumnDescription[] = [];

  where(callback: (builder: WhereBuilder) => void): this {
    callback(this.whereBuilder);
    return this;
  }

  groupBy(...columns: string[]): this {
    columns.forEach((c) => this.groupByBuilder.add(c));
    return this;
  }

  having(callback: (builder: WhereBuilder) => void): this {
    callback(this.havingBuilder);
    return this;
  }

  returning(...columns: string[]): this {
    this.returningColumns = columns.map((c) => {
      const [name, alias] = c.trim().split(/\s+[Aa][Ss]\s+/);
      return {name, alias};
    });
    return this;
  }

  orderBy(column: string, direction: OrderDirection = "ASC"): this {
    this.orderByBuilder.add(column, direction);
    return this;
  }

  limit(count: number): this {
    this.limitBuilder.set(count);
    return this;
  }

  offset(count: number): this {
    this.offsetBuilder.set(count);
    return this;
  }

  innerJoin(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    this.joinBuilder.join(table, on);
    return this;
  }

  leftJoin(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    this.joinBuilder.leftJoin(table, on);
    return this;
  }

  rightJoin(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    this.joinBuilder.rightJoin(table, on);
    return this;
  }

  fullJoin(table: string, on: (builder: WhereBuilder) => WhereBuilder): this {
    this.joinBuilder.fullJoin(table, on);
    return this;
  }

  crossJoin(table: string): this {
    this.joinBuilder.crossJoin(table);
    return this;
  }

  protected buildCommonClauses(): Partial<QueryDescription> {
    const where = this.whereBuilder.build();
    const having = this.havingBuilder.build();
    return {
      where: where.conditions.length > 0 ? where : undefined,
      groupBy: this.groupByBuilder.build() || undefined,
      having: having.conditions.length > 0 ? having : undefined,
      orderBy: this.orderByBuilder.build() || undefined,
      limit: this.limitBuilder.build() || undefined,
      offset: this.offsetBuilder.build() || undefined,
      join: this.joinBuilder.build() || undefined,
      returning:
        this.returningColumns.length > 0 ? {type: ClauseType.Returning, columns: this.returningColumns} : undefined,
    };
  }
}
