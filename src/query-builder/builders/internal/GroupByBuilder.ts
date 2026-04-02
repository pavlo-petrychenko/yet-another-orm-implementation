import pino from "pino";
import {ColumnDescription} from "@/query-builder/types/common/Column";
import {GroupByClause} from "@/query-builder/types/clause/GroupByClause/GroupByClause";
import {ClauseType} from "@/query-builder/types/clause/Clause";

export class GroupByBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private columns: ColumnDescription[] = [];

  add(column: string): this {
    if (!column || typeof column !== "string") {
      this.logger.error({column}, "Invalid column name provided");
      throw new Error("Column name must be a non-empty string");
    }
    this.logger.debug({name: column}, "Adding column to GROUP BY clause");
    this.columns.push({name: column});
    return this;
  }

  build(): GroupByClause | null {
    if (this.columns.length) {
      return {type: ClauseType.GroupBy, columns: this.columns};
    } else {
      this.logger.debug("No GROUP BY clause to build");
      return null;
    }
  }
}
