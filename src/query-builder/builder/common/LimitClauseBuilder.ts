import { LimitClause } from "@/query-builder/queries/common/LimitClause";
import pino from "pino";
/**
 * Builder class for constructing a SQL LIMIT clause.
 */
export class LimitBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });
    /**
     * The number of rows to limit the result set to.
     * @private
     */
  private count: number | null = null;

      /**
     * Sets the limit count for the query.
     *
     * @param count - The maximum number of rows to return.
     * @returns The current LimitBuilder instance.
     */
  set(count: number): this {
    // Validate limit value
    if (!Number.isInteger(count) || count < 0) {
      this.logger.error({ count }, "Invalid limit value");
      throw new Error("Limit must be a non-negative integer");
    }
    this.logger.debug({ count }, "Adding LIMIT clause");
    this.count = count;
    return this;
  }

    /**
     * Builds and returns the LIMIT clause.
     *
     * @returns A LimitClause object if a count is set, otherwise null.
     */
  build(): LimitClause | null {
    if (this.count !== null) {
      this.logger.debug(
        { type: "limit", count: this.count },
        "Built LIMIT clause"
      );
      return { type: "limit", count: this.count };
    } else {
      this.logger.debug("No LIMIT clause to build");
      return null;
    }
  }
}
