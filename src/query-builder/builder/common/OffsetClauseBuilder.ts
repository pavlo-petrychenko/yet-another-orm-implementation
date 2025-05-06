import { OffsetClause } from "@/query-builder/queries/common/OffsetClause";
import pino from "pino";
/**
 * Builder class for constructing a SQL OFFSET clause.
 */
export class OffsetBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  
    /**
     * The number of rows to skip in the result set.
     * @private
     */
  private count: number | null = null;

      /**
     * Sets the offset count for the query.
     *
     * @param count - The number of rows to skip.
     * @returns The current OffsetBuilder instance.
     */
  set(count: number): this {
    // Validate offset value
    if (!Number.isInteger(count) || count < 0) {
      this.logger.error({ count }, "Invalid offset value");
      throw new Error("Offset must be a non-negative integer");
    }
    this.logger.debug({ count }, "Setting OFFSET clause");
    this.count = count;
    return this;
  }
    /**
     * Builds and returns the OFFSET clause.
     *
     * @returns An OffsetClause object if a count is set, otherwise null.
     */
  build(): OffsetClause | null {
    if (this.count !== null) {
      this.logger.debug(
        { type: "offset", count: this.count },
        "Built OFFSET clause"
      );
      return { type: "offset", count: this.count };
    } else {
      this.logger.debug("No OFFSET clauses to build");
      return null;
    }
  }
}
