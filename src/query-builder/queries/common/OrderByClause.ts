import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
/**
 * Represents an ORDER BY clause in a SQL query, defining the sorting of the result set.
 */
export type OrderDirection = "ASC" | "DESC";
/**
 * Describes the structure of an ORDER BY clause including sorting directions.
 */
export interface OrderByClause {
    /**
     * The type identifier for this clause.
     */
    type: "order_by";
    /**
     * A list of columns along with their sort directions (ASC or DESC).
     */
    orders: { column: ColumnDescription; direction: OrderDirection }[];
}