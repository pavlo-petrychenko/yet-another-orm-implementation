import {
  OrderByClause,
  OrderDirection,
} from "@/query-builder/queries/common/OrderByClause";
import { ColumnDescription } from "@/query-builder/queries/common/ColumnDecription";
import pino from "pino";

/**
 * Builder class for constructing a SQL ORDER BY clause.
 */
export class OrderByBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

      /**
     * List of columns and their sort directions.
     * @private
     */
  private orders: { column: ColumnDescription; direction: OrderDirection }[] =
    [];

      /**
     * Adds a column to the ORDER BY clause.
     *
     * @param column - The name of the column to order by.
     * @param direction - The direction of ordering ('ASC' or 'DESC'). Defaults to 'ASC'.
     * @returns The current OrderByBuilder instance.
     */
  add(column: string, direction: OrderDirection = "ASC"): this {
    // Validate column name and direction
    if (!column || typeof column !== "string") {
      this.logger.error({ column }, "Invalid column name provided");
      throw new Error("Column name must be a non-empty string");
    }

    if (direction !== "ASC" && direction !== "DESC") {
      this.logger.error({ direction }, "Invalid direction provided: ");
      throw new Error("Order direction must be either 'ASC' or 'DESC'");
    }

    this.logger.debug(
      { column: { name: column }, direction },
      "Adding ORDER BY clause"
    );

    this.orders.push({ column: { name: column }, direction });
    return this;
  }

    /**
     * Builds and returns the ORDER BY clause.
     *
     * @returns An OrderByClause object if at least one order is defined, otherwise null.
     */
  build(): OrderByClause | null {
    if (this.orders.length) {
      this.logger.debug({ orders: this.orders }, "Built ORDER BY clause");
      return { type: "order_by", orders: this.orders };
    } else {
      this.logger.debug("No ORDER BY clauses to build");
      return null;
    }
  }
}
