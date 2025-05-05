import {
  OrderByClause,
  OrderDirection,
} from "@/query-builder/queries/common/OrderByClause";
import { ColumnDescription } from "@/query-builder/queries/common/ColumnDecription";
import pino from "pino";

export class OrderByBuilder {
  private logger = pino({
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private orders: { column: ColumnDescription; direction: OrderDirection }[] =
    [];

  add(column: string, direction: OrderDirection = "ASC"): this {
    // Log invalid column names or directions
    if (!column || typeof column !== "string") {
      this.logger.error({ column }, "Invalid column name provided: ");
      throw new Error("Column name must be a non-empty string");
    }

    if (direction !== "ASC" && direction !== "DESC") {
      this.logger.error({ direction }, "Invalid direction provided: ");
      throw new Error("Order direction must be either 'ASC' or 'DESC'");
    }

    this.logger.debug({ column, direction }, "Adding ORDER BY clause: ");

    this.orders.push({ column: { name: column }, direction });
    return this;
  }

  build(): OrderByClause | null {
    if (this.orders.length) {
      this.logger.debug({ orders: this.orders }, "Built ORDER BY clause: ");
      return { type: "order_by", orders: this.orders };
    } else {
      this.logger.debug("No ORDER BY clauses to build");
      return null;
    }
  }
}
