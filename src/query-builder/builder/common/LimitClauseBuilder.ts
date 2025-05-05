import { LimitClause } from "@/query-builder/queries/common/LimitClause";
import pino from "pino";

export class LimitBuilder {
  private logger = pino({
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private count: number | null = null;

  set(count: number): this {
    // Log invalid limit values
    if (!Number.isInteger(count) || count < 0) {
      this.logger.error({ count }, "Invalid limit value");
      throw new Error("Limit must be a non-negative integer");
    }
    this.logger.debug({ count }, "Adding LIMIT clause: ");
    this.count = count;
    return this;
  }

  build(): LimitClause | null {
    if (this.count !== null) {
      this.logger.debug(
        { type: "limit", count: this.count },
        "Built LIMIT clause: "
      );
      return { type: "limit", count: this.count };
    } else {
      this.logger.debug("No LIMIT clause to build");
      return null;
    }
  }
}
