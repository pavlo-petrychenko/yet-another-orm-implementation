import {OrderByClause, OrderDirection} from "@/query-builder/queries/common/OrderByClause";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";



export class OrderByBuilder {
    private orders: { column: ColumnDescription; direction: OrderDirection }[] = [];

    add(column: string, direction: OrderDirection = "ASC"): this {
        this.orders.push({ column : {name : column}, direction });
        return this;
    }

    build(): OrderByClause | null {
        return this.orders.length
            ? { type: "order_by", orders: this.orders }
            : null;
    }
}