/**
 * Represents a compiled SQL query with its associated parameters.
 *
 * This interface is used as the output of SQL compiler classes
 * (e.g., `PostgresSelectCompiler`, `PostgresInsertCompiler`, etc.).
 * It encapsulates the final SQL string along with the values
 * to be bound to any placeholders (e.g., `$1`, `$2`, etc.).
 */
export interface CompiledQuery {
    /**
     * The SQL statement as a string, with placeholders for parameters
     * (e.g., `SELECT * FROM users WHERE id = $1`).
     */
    sql: string;
    /**
     * An array of parameter values that will be bound to the SQL placeholders.
     * The order of values must match the order of placeholders in the `sql` string.
     */
    params: any[];
}