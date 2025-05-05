import { OffsetClause } from "@/query-builder/queries/common/OffsetClause";
import pino from "pino";

export class OffsetBuilder {
  private logger = pino({
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private count: number | null = null;

  set(count: number): this {
    // Log invalid offset values
    if (!Number.isInteger(count) || count < 0) {
      this.logger.error({ count }, "Invalid offset value");
      throw new Error("Offset must be a non-negative integer");
    }
    this.logger.debug({ count }, "Setting OFFSET clause: ");
    this.count = count;
    return this;
  }

  build(): OffsetClause | null {
    if (this.count !== null) {
      this.logger.debug(
        { type: "offset", count: this.count },
        "Built OFFSET clause: "
      );
      return { type: "offset", count: this.count };
    } else {
      this.logger.debug("No OFFSET clauses to build");
      return null;
    }
  }
}
