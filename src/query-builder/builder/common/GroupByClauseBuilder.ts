import { GroupByClause } from "@/query-builder/queries/common/GroupByClause";
import { ColumnDescription } from "@/query-builder/queries/common/ColumnDecription";
import pino from "pino";

export class GroupByBuilder {
  private logger = pino({
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private columns: ColumnDescription[] = [];

  add(column: string): this {
    // Log invalid column names
    if (!column || typeof column !== "string") {
      this.logger.error({ column }, "Invalid column name provided: ");
      throw new Error("Column name must be a non-empty string");
    }
    this.logger.debug({name: column}, "Adding GROUP BY clause: ");
    this.columns.push({ name: column });
    return this;
  }

  build(): GroupByClause | null {

    if(this.columns.length)
    {
        this.logger.debug({ type: "group_by", columns: this.columns }, "Built GROUP BY clause: ")
        return { type: "group_by", columns: this.columns };
    }
    else{
        this.logger.debug("No GROUP BY clause to build")
        return null;
    }
  }
}
