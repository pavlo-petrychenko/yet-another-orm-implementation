import { ClauseMixin } from "@/query-builder/builder/common/ClauseMixin";
import { UpdateQuery } from "@/query-builder/queries/Update";
import pino from "pino";

/**
 * Builder class for constructing SQL UPDATE queries.
 * Extends {@link ClauseMixin} to support common SQL clauses (e.g., WHERE, ORDER BY).
 */
export class UpdateQueryBuilder extends ClauseMixin {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });
    /**
     * The name of the table to be updated.
     * @private
     */
  private tableName: string = "";
  
      /**
     * A map of column names to their new values.
     * @private
     */
  private updates: Record<string, any> = {};

      /**
     * Sets the target table for the UPDATE query.
     *
     * @param table - The name of the table to update.
     * @returns The current UpdateQueryBuilder instance.
     */
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
    /**
     * Specifies the columns and their new values.
     *
     * @param updates - An object containing column-value pairs to update.
     * @returns The current UpdateQueryBuilder instance.
     */
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

        /**
     * Builds and returns the final UPDATE query object.
     *
     * @returns An {@link UpdateQuery} representing the UPDATE SQL statement.
     */
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
