/**
 * Options for defining a database column.
 *
 * These are optional parameters typically used to configure how
 * a class property maps to a column in the database.
 */
export interface ColumnOptions {
    /**
     * The name of the column in the database.
     */
    name?: string;
    /**
     * The data type of the column (e.g., 'varchar', 'int', etc.).
     */
    type?: string;
}
/**
 * Metadata representation of a column.
 *
 * Extends basic column options with the property key,
 * which refers to the name of the property in the class.
 */
export interface ColumnMetadata extends ColumnOptions {
    /**
     * The name of the property in the class that this column maps to.
     */
    propertyKey: string;
}

