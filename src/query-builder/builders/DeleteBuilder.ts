import pino from "pino";
import {ClauseMixin} from "@/query-builder/builders/internal/ClauseMixin";
import {DeleteQuery} from "@/query-builder/types/query/DeleteQuery/DeleteQuery";
import {QueryType} from "@/query-builder/types/QueryType";

export class DeleteBuilder extends ClauseMixin {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private tableName: string = "";

  from(table: string): this {
    if (!table || typeof table !== "string") {
      this.logger.error({table}, "DeleteBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    this.tableName = table;
    this.logger.debug({table}, "DeleteBuilder: Set table name");
    return this;
  }

  build(): DeleteQuery {
    this.logger.debug(
      {
        type: "DELETE",
        table: this.tableName,
        ...this.buildCommonClauses(),
      },
      "Built DELETE query",
    );

    return {
      type: QueryType.DELETE,
      table: this.tableName,
      ...this.buildCommonClauses(),
    };
  }
}
