import pino from "pino";
import {ClauseMixin} from "@/query-builder/builders/internal/ClauseMixin";
import {UpdateQuery} from "@/query-builder/types/query/UpdateQuery/UpdateQuery";
import {QueryType} from "@/query-builder/types/QueryType";

export class UpdateBuilder extends ClauseMixin {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private tableName: string = "";
  private updates: Record<string, any> = {};

  table(table: string): this {
    if (!table || typeof table !== "string") {
      this.logger.error({table}, "UpdateBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    this.tableName = table;
    this.logger.debug({table}, "UpdateBuilder: Set table name");
    return this;
  }

  set(updates: Record<string, any>): this {
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      this.logger.error({updates}, "UpdateBuilder: Invalid updates");
      throw new Error("Updates must be a non-empty object");
    }
    this.updates = updates;
    this.logger.debug({updates}, "UpdateBuilder: Set values");
    return this;
  }

  build(): UpdateQuery {
    this.logger.debug(
      {
        type: "UPDATE",
        table: this.tableName,
        values: this.updates,
        ...this.buildCommonClauses(),
      },
      "Built UPDATE query",
    );

    return {
      type: QueryType.UPDATE,
      table: this.tableName,
      values: this.updates,
      ...this.buildCommonClauses(),
    };
  }
}
