import { ClauseMixin } from "@/query-builder/builder/common/ClauseMixin";
import { UpdateQuery } from "@/query-builder/queries/Update";
import pino from "pino";

export class UpdateQueryBuilder extends ClauseMixin {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private tableName: string = "";
  private updates: Record<string, any> = {};

  table(table: string): this {
    // Validate table name
    if (!table || typeof table !== "string") {
      this.logger.error({ table }, "UpdateQueryBuilder: Invalid table name");
      throw new Error("Table name must be a non-empty string");
    }
    this.tableName = table;
    this.logger.debug({ table }, "UpdateQueryBuilder: Set table name");
    return this;
  }

  set(updates: Record<string, any>): this {
    // Validate updates
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      this.logger.error({ updates }, "UpdateQueryBuilder: Invalid updates");
      throw new Error("Updates must be a non-empty object");
    }
    this.updates = updates;
    this.logger.debug({ updates }, "UpdateQueryBuilder: Set values");
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
      "Built UPDATE query"
    );

    return {
      type: "UPDATE",
      table: this.tableName,
      values: this.updates,
      ...this.buildCommonClauses(),
    };
  }
}
