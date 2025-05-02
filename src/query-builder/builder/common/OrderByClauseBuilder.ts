import {OrderByClause, OrderDirection} from "@/query-builder/queries/common/OrderByClause";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

/**
 * Builder class for constructing a SQL ORDER BY clause.
 */

export class OrderByBuilder {
    /**
     * List of columns and their sort directions.
     * @private
     */

    private orders: { column: ColumnDescription; direction: OrderDirection }[] = [];
    /**
     * Adds a column to the ORDER BY clause.
     *
     * @param column - The name of the column to order by.
     * @param direction - The direction of ordering ('ASC' or 'DESC'). Defaults to 'ASC'.
     * @returns The current OrderByBuilder instance.
     */
    add(column: string, direction: OrderDirection = "ASC"): this {
        this.orders.push({ column : {name : column}, direction });
        return this;
    }
    /**
     * Builds and returns the ORDER BY clause.
     *
     * @returns An OrderByClause object if at least one order is defined, otherwise null.
     */
    build(): OrderByClause | null {
        return this.orders.length
            ? { type: "order_by", orders: this.orders }
            : null;
    }
}