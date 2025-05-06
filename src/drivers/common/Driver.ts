import { Dialect } from './Dialect';
import {Query} from "@/query-builder/queries/Query";
/**
 * Interface for a database driver implementation.
 *
 * Provides methods for managing a database connection and executing queries.
 * This abstraction allows plugging different DB engines (e.g., Postgres, MySQL)
 * via a common interface, following the Strategy pattern.
 */
export interface Driver {
    /**
     * Establishes a connection to the database.
     */
    connect(): Promise<void>;
    /**
     * Closes the database connection and cleans up resources.
     */
    disconnect(): Promise<void>;
    /**
     * Executes a query against the database.
     *
     * @param query - A structured query to be executed.
     * @returns A promise resolving with the query result.
     */
    query(query: Query): Promise<any>;
    /**
     * Indicates whether the driver is currently connected to the database.
     *
     * @returns `true` if connected; otherwise `false`.
     */
    isConnected(): boolean;
    /**
     * Returns the SQL dialect used by the driver.
     *
     * @returns An object implementing the Dialect interface.
     */
    getDialect(): Dialect;
}
