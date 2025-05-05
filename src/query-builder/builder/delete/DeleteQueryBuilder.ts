import { ClauseMixin } from "@/query-builder/builder/common/ClauseMixin";
import { DeleteQuery } from "@/query-builder/queries/Delete";
import pino from "pino";

export class DeleteQueryBuilder extends ClauseMixin {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private tableName: string = "";

  from(table: string): this {
    // Validate table name
    if (!table || typeof table !== "string") {
      this.logger.error({ table }, "DeleteQueryBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    this.tableName = table;
    this.logger.debug({ table }, "DeleteQueryBuilder: Set table name");
    return this;
  }

  build(): DeleteQuery {
    this.logger.debug(
      {
        type: "DELETE",
        table: this.tableName,
        ...this.buildCommonClauses(),
      },
      "Built DELETE query"
    );

    return {
      type: "DELETE",
      table: this.tableName,
      ...this.buildCommonClauses(),
    };
  }
}
