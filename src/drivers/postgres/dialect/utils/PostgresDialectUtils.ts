import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

/**
 * Utility class for handling PostgreSQL identifier escaping and column formatting.
 * This class provides methods to properly escape and format identifiers, column names,
 * and table references according to PostgreSQL syntax rules.
 */

export class PostgresDialectUtils {
    /**
     * Escapes an identifier or formats a column description according to PostgreSQL syntax.
     *
     * @param str - Either a string to be escaped or a ColumnDescription object to be formatted
     * @returns A properly escaped and formatted string suitable for use in PostgreSQL queries
     *
     * @example
     * // Escaping a simple string identifier
     * utils.escapeIdentifier('column_name') // returns '"column_name"'
     *
     * @example
     * // Escaping a string with double quotes
     * utils.escapeIdentifier('column"name') // returns '"column""name"'
     *
     * @example
     * // Formatting a column with alias
     * utils.escapeIdentifier({
     *   name: 'column_name',
     *   alias: 'col_alias'
     * }) // returns '"column_name" AS "col_alias"'
     *
     * @example
     * // Formatting a column with table reference
     * utils.escapeIdentifier({
     *   name: 'column_name',
     *   table: 'table_name'
     * }) // returns '"table_name"."column_name"'
     */
    escapeIdentifier(str : ColumnDescription | string) : string{
        if(typeof str === "string"){
            return `"${str.replace(/"/g, '""')}"`
        }

        return this.escapeColumnDescription(str)
    }

    /**
     * Handles the escaping and formatting of a column description.
     *
     * @param col - The column description to format
     * @returns A properly formatted string representing the column in PostgreSQL syntax
     * @private
     */
    private escapeColumnDescription(col: ColumnDescription): string {
        if (col.name.includes('.')) {
            return this.escapeQualifiedColumn(col);
        }
        return this.escapeSimpleColumn(col);
    }

    /**
     * Handles the escaping and formatting of a qualified column (containing table reference in the name).
     *
     * @param col - The column description containing a qualified name (table.column)
     * @returns A properly formatted string representing the qualified column in PostgreSQL syntax
     * @private
     */
    private escapeQualifiedColumn(col: ColumnDescription): string {
        const [table, name] = col.name.split('.')
        return col.alias ? `${this.escapeIdentifier(table)}.${this.escapeIdentifier(name)} AS ${this.escapeIdentifier(col.alias)}` : `${this.escapeIdentifier(table)}.${this.escapeIdentifier(name)}`;
    }

    /**
     * Handles the escaping and formatting of a simple column (without table reference in the name).
     *
     * @param col - The column description to format
     * @returns A properly formatted string representing the simple column in PostgreSQL syntax
     * @private
     */
    private escapeSimpleColumn(col: ColumnDescription): string {
        if(col.table){
            const qualifiedColumn = `${this.escapeIdentifier(col.table)}.${this.escapeIdentifier(col.name)}`;
            return col.alias ? `${qualifiedColumn} AS ${this.escapeIdentifier(col.alias)}` : qualifiedColumn;
        }else{
            return col.alias ? `${this.escapeIdentifier(col.name)} AS ${this.escapeIdentifier(col.alias)}` : `${this.escapeIdentifier(col.name)}`

        }
    }
}