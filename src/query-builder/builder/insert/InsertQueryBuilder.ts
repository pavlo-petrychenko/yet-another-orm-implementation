import { InsertQuery } from "@/query-builder/queries/Insert";
import pino from "pino";

export class InsertQueryBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });
  private tableName: string = "";
  private values: Record<string, any>;

  into(table: string): this {
    // Validate table name
    if (!table || typeof table !== "string") {
      this.logger.error({ table }, "InsertQueryBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    this.tableName = table;
    this.logger.debug({ table }, "InsertQueryBuilder: Set table name");
    return this;
  }

  valuesList(values: Record<string, any>): this {
    // Validate values
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      this.logger.error({ values }, "InsertQueryBuilder: Invalid values");
      throw new Error("Values must be a non-empty object");
    }
    this.values = values;
    this.logger.debug({ values }, "InsertQueryBuilder: Set values");
    return this;
  }

  build(): InsertQuery {
    this.logger.debug(
      {
        type: "INSERT",
        table: this.tableName,
        values: this.values,
      },
      "Built INSERT query"
    );

    return {
      type: "INSERT",
      table: this.tableName,
      values: this.values,
    };
  }
}
