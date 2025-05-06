import { Driver } from "../common/Driver";
import { DriverConfig } from "../common/DriverConfig";
import { Pool, createPool } from "mysql2/promise";
import { MySqlDialect } from "@/drivers/mysql/dialect/MySqlDialect";
import { Dialect } from "@/drivers/common/Dialect";
import { Query } from "@/query-builder/queries/Query";
import pino from "pino";

/**
 * MySqlDriver is a singleton class responsible for managing
 * MySQL database connections and executing queries using MySqlDialect.
 */
export class MySqlDriver implements Driver {
  private static instance: MySqlDriver | null = null;
  private pool: Pool | null = null;
  private config: DriverConfig;

  private readonly dialect: MySqlDialect;

  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private constructor(config: DriverConfig) {
    this.config = config;
    this.dialect = new MySqlDialect();
  }

  public static getInstance(config: DriverConfig): MySqlDriver {
    if (!MySqlDriver.instance) {
      MySqlDriver.instance = new MySqlDriver(config);
    }
    return MySqlDriver.instance;
  }

  async connect(): Promise<void> {
    if (!this.pool) {
      try {
        this.logger.debug(
          {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            database: this.config.database,
          },
          "Attempting to connect to MySQL database: "
        );

        this.pool = createPool({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
        await this.pool.query("SELECT 1"); // Test connection
        this.logger.info("Successfully connected to MySQL database");
      } catch (error) {
        if (error instanceof Error) {
          // Log error information
          this.logger.error("Connection failed: ", {
            error: error.message,
            stack: error.stack,
          });
          throw new Error(
            "Unable to connect to MySQL database: " + error.message
          );
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
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        this.logger.debug("Attempting to disconnect from MySQL database");
        await this.pool.end();
        this.logger.info("Disconnected from MySQL database");
        this.pool = null;
      } catch (error) {
        if (error instanceof Error) {
          // Log error information
          this.logger.error("Disconnection failed: ", {
            error: error.message,
            stack: error.stack,
          });
          throw new Error(
            "Unable to disconnect from MySQL database: " + error.message
          );
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
    }
  }

  async query(query: Query): Promise<any> {
    if (!this.pool) {
      const error = new Error("Not connected to database");
      this.logger.error("Query failed: ", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }

    const { sql, params } = this.dialect.buildQuery(query);
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

    const startTime = Date.now();

    // Log the query details
    this.logger.debug(
      {
        sql,
        params,
        timestamp: new Date().toISOString(),
      },
      "Executing query: "
    );

    try {
      const [rows] = await this.pool.execute(sql, params);
      const duration = Date.now() - startTime;
      // Log timing information
      this.logger.debug("Query completed in %dms", duration);
      this.logger.debug(
        {
          rowCount: Array.isArray(rows) ? rows.length : undefined,
          duration,
        },
        "Query result: "
      );
      return rows;
    } catch (error) {
      if (error instanceof Error) {
        // Log error information
        this.logger.debug(
          {
            sql,
            params,
            error: error.message,
            stack: error.stack,
          },
          "Query failed: "
        );
        throw new Error("Database error while executing query: " + sql);
      }
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }

  getDialect(): Dialect {
    return this.dialect;
  }
}

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
