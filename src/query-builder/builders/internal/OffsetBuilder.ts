import pino from "pino";
import {OffsetClause} from "@/query-builder/types/clause/OffsetClause/OffsetClause";
import {ClauseType} from "@/query-builder/types/clause/Clause";

export class OffsetBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private count: number | null = null;

  set(count: number): this {
    if (!Number.isInteger(count) || count < 0) {
      this.logger.error({count}, "Invalid offset value");
      throw new Error("Offset must be a non-negative integer");
    }
    this.logger.debug({count}, "Setting OFFSET clause");
    this.count = count;
    return this;
  }

  build(): OffsetClause | null {
    if (this.count !== null) {
      this.logger.debug({type: "offset", count: this.count}, "Built OFFSET clause");
      return {type: ClauseType.Offset, count: this.count};
    } else {
      this.logger.debug("No OFFSET clauses to build");
      return null;
    }
  }
}
