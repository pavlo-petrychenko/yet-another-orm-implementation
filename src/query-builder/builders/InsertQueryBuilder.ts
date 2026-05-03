import { type Builder } from "@/query-builder/builders/Builder";
import { ReturningClauseBuilder } from "@/query-builder/builders/internal/ReturningClauseBuilder";
import { QueryBuilderError } from "@/query-builder/errors/QueryBuilderError";
import { type InsertQuery, type OnConflictClause, QueryType } from "@/query-builder/types";
import { type TableDescription } from "@/query-builder/types/common/TableDescription";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";

export class InsertQueryBuilder implements Builder {
  private _table: TableDescription;
  private _values: Record<string, any>[] = [];
  private _returningBuilder: ReturningClauseBuilder = new ReturningClauseBuilder();
  private _onConflict: OnConflictClause | undefined;

  constructor({ table }: { table: TableDescription }) {
    this._table = table;
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

  onConflict(clause: OnConflictClause): this {
    if (clause.targetColumns.length === 0) {
      throw new QueryBuilderError("InsertQueryBuilder", [
        "onConflict.targetColumns must be non-empty",
      ]);
    }
    this._onConflict = clause;
    return this;
  }

  build(): InsertQuery {
    const errors: string[] = [];
    if (this._values.length === 0) {
      errors.push("values() or valuesList() is required: no values specified for INSERT query");
    }
    if (errors.length > 0) {
      throw new QueryBuilderError("InsertQueryBuilder", errors);
    }

    const query: InsertQuery = {
      type: QueryType.INSERT,
      table: this._table,
      values: this._values,
    };
    if (!this._returningBuilder.isEmpty()) query.returning = this._returningBuilder.build();
    if (this._onConflict) query.onConflict = this._onConflict;
    return query;
  }
}
