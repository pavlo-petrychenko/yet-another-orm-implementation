import pino from "pino";
import {ColumnDescription} from "@/query-builder/types/common/Column";
import {OrderByClause} from "@/query-builder/types/clause/OrderByClause/OrderByClause";
import {OrderDirection} from "@/query-builder/types/common/OrderDirection";
import {ClauseType} from "@/query-builder/types/clause/Clause";

export class OrderByBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private orders: {column: ColumnDescription; direction: OrderDirection}[] = [];

  add(column: string, direction: OrderDirection = "ASC"): this {
    if (!column || typeof column !== "string") {
      this.logger.error({column}, "Invalid column name provided");
      throw new Error("Column name must be a non-empty string");
    }

    if (direction !== "ASC" && direction !== "DESC") {
      this.logger.error({direction}, "Invalid direction provided: ");
      throw new Error("Order direction must be either 'ASC' or 'DESC'");
    }

    this.logger.debug({column: {name: column}, direction}, "Adding ORDER BY clause");

    this.orders.push({column: {name: column}, direction});
    return this;
  }

  build(): OrderByClause | null {
    if (this.orders.length) {
      this.logger.debug({orders: this.orders}, "Built ORDER BY clause");
      return {type: ClauseType.OrderBy, orders: this.orders};
    } else {
      this.logger.debug("No ORDER BY clauses to build");
      return null;
    }
  }
}
