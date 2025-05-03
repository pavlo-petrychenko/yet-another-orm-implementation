
import { Driver } from '../common/Driver';
import { DriverConfig } from '../common/DriverConfig';
import { Pool, createPool } from 'mysql2/promise';
import {MySqlDialect} from "@/drivers/mysql/dialect/MySqlDialect";
import {Dialect} from "@/drivers/common/Dialect";
import {Query} from "@/query-builder/queries/Query";
/**
 * MySqlDriver is a singleton class responsible for managing
 * MySQL database connections and executing queries using MySqlDialect.
 */
export class MySqlDriver implements Driver {
    private static instance: MySqlDriver | null = null;
    private pool: Pool | null = null;
    private config: DriverConfig;

    private readonly dialect : MySqlDialect;
    /**
     * Private constructor to enforce singleton pattern.
     * @param config MySQL connection configuration
     */
    private constructor(config: DriverConfig) {
        this.config = config;
        this.dialect = new MySqlDialect();
    }
    /**
     * Returns a singleton instance of MySqlDriver.
     * @param config MySQL connection configuration
     */
    public static getInstance(config: DriverConfig): MySqlDriver {
        if (!MySqlDriver.instance) {
            MySqlDriver.instance = new MySqlDriver(config);
        }
        return MySqlDriver.instance;
    }
    /**
     * Initializes the connection pool.
     */
    async connect(): Promise<void> {
        if (!this.pool) {
            this.pool = createPool({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.username,
                password: this.config.password,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
        }
    }
    /**
     * Closes the connection pool.
     */
    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
    /**
     * Executes the given query using the MySQL driver.
     * @param query Query object to execute
     * @returns Query result
     */
    async query(query : Query): Promise<any> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const {sql, params} = this.dialect.buildQuery(query);

        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }
    /**
     * Returns connection status.
     */
    isConnected(): boolean {
        return this.pool !== null;
    }
    /**
     * Returns current SQL dialect.
     */
    getDialect(): Dialect {
        return this.dialect;
    }
}