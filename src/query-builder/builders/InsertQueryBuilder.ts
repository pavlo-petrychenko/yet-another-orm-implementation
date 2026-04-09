import { type Builder } from "@/query-builder/builders/Builder";
import { ReturningClauseBuilder } from "@/query-builder/builders/internal/ReturningClauseBuilder";
import { type InsertQuery, QueryType } from "@/query-builder/types";
import { type TableDescription } from "@/query-builder/types/common/TableDescription";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";

export class InsertQueryBuilder implements Builder {
  private _table: TableDescription;
  private _values: Record<string, any>[] = [];
  private _returningBuilder: ReturningClauseBuilder = new ReturningClauseBuilder();

  into(table: TableDescription): this {
    this._table = table;
    return this;
  }

  values(record: Record<string, any>): this {
    this._values.push(record);
    return this;
  }

  valuesList(records: Record<string, any> | Record<string, any>[]): this {
    if (Array.isArray(records)) {
      this._values.push(...records);
    } else {
      this._values.push(records);
    }
    return this;
  }

  returning(...columns: ColumnDescription[]): this {
    this._returningBuilder.set(...columns);
    return this;
  }

  build(): InsertQuery {
    const query: InsertQuery = {
      type: QueryType.INSERT,
      table: this._table,
      values: this._values,
    };
    if (!this._returningBuilder.isEmpty()) query.returning = this._returningBuilder.build();
    return query;
  }
}
