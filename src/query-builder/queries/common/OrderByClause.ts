import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

export type OrderDirection = "ASC" | "DESC";

export interface OrderByClause {
    type: "order_by";
    orders: { column: ColumnDescription; direction: OrderDirection }[];
}