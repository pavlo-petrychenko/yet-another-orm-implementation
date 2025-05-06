/**
 * Describes a column used in SQL queries.
 */
export interface ColumnDescription {
    /**
     * The name of the column.
     */
    name: string;
    /**
     * (Optional) The name of the table the column belongs to.
     */
    table?: string;
    /**
     * (Optional) An alias to reference the column in the query.
     */
    alias?: string;
}