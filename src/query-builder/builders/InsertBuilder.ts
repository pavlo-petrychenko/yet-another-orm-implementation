import pino from "pino";
import {InsertQuery} from "@/query-builder/types/query/InsertQuery/InsertQuery";
import {QueryType} from "@/query-builder/types/QueryType";
import {ColumnDescription} from "@/query-builder/types/common/Column";
import {ClauseType} from "@/query-builder/types/clause/Clause";

export class InsertBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private tableName: string = "";
  private values: Record<string, any> | Record<string, any>[];
  private returningColumns: ColumnDescription[] = [];

  into(table: string): this {
    if (!table || typeof table !== "string") {
      this.logger.error({table}, "InsertBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    this.tableName = table;
    this.logger.debug({table}, "InsertBuilder: Set table name");
    return this;
  }

  valuesList(values: Record<string, any> | Record<string, any>[]): this {
    if (Array.isArray(values)) {
      if (values.length === 0) {
        this.logger.error({values}, "InsertBuilder: Empty values array");
        throw new Error("Values array must not be empty");
      }
      values.forEach((v, i) => {
        if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length === 0) {
          this.logger.error({values: v, index: i}, "InsertBuilder: Invalid values at index");
          throw new Error(`Values at index ${i} must be a non-empty object`);
        }
      });
    } else {
      if (!values || typeof values !== "object" || Object.keys(values).length === 0) {
        this.logger.error({values}, "InsertBuilder: Invalid values");
        throw new Error("Values must be a non-empty object");
      }
    }
    this.values = values;
    this.logger.debug({values}, "InsertBuilder: Set values");
    return this;
  }

  returning(...columns: string[]): this {
    this.returningColumns = columns.map((c) => {
      const [name, alias] = c.trim().split(/\s+[Aa][Ss]\s+/);
      return {name, alias};
    });
    return this;
  }

  build(): InsertQuery {
    this.logger.debug(
      {
        type: "INSERT",
        table: this.tableName,
        values: this.values,
      },
      "Built INSERT query",
    );

    return {
      type: QueryType.INSERT,
      table: this.tableName,
      values: this.values,
      returning:
        this.returningColumns.length > 0 ? {type: ClauseType.Returning, columns: this.returningColumns} : undefined,
    };
  }
}
