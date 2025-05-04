import {Query} from "@/query-builder/queries/Query";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

// Strategy
// Adapter

/**
 * Represents a SQL dialect interface for building database-specific queries.
 *
 * This follows the Strategy and Adapter design patterns:
 * - **Strategy**: allows the query building logic to vary per database.
 * - **Adapter**: adapts internal query representations to raw SQL strings.
 */


export interface Dialect {
    /**
     * Builds a raw SQL query and its parameter list from a structured query object.
     *
     * @param query - The structured query object.
     * @returns An object containing the SQL string and its parameters.
     */
    buildQuery(query: Query): { sql: string; params: any[] };
    // escapeIdentifier(str: ColumnDescription | string): string;
    // parameterize(index: number): string;

}