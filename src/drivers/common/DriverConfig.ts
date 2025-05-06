
/**
 * Configuration options for initializing a database driver.
 *
 * Used to provide necessary connection details depending on the database type.
 * Some fields are specific to certain database engines.
 */
export interface DriverConfig {
    /**
     * Optional full connection URL string (e.g. for PostgreSQL: `postgres://user:pass@host:port/db`).
     */
    url? : string,
    /**
     * Username for authenticating with the database.
     */
    username? : string,
    /**
     * Hostname or IP address of the database server.
     */
    host? : string,
    /**
     * Password associated with the given username.
     */
    password? : string,
    /**
     * Name of the database to connect to.
     */
    database? : string,
    /**
     * Port number on which the database server is listening.
     */
    port? : number,
    /**
     * Path to the SQLite database file (used only for SQLite).
     */
    filename? : string
}