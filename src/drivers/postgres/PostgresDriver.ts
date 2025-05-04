import { Driver } from "@/drivers/common/Driver";
import { PostgresConfig } from "@/drivers/postgres/PostgresConfig";
import { Pool } from "pg";
import { DriverConfig } from "@/drivers/common/DriverConfig";
import { PostgresDialect } from "@/drivers/postgres/dialect/PostgresDialect";
import { Query } from "@/query-builder/queries/Query";
import debug from "debug";
import pino from "pino";

// singleton

export class PostgresDriver implements Driver {
  private static instance: PostgresDriver | null = null;
  private pool: Pool | null = null;
  private readonly config: DriverConfig;

  private readonly dialect: PostgresDialect;

  private readonly queryDebug = debug("postgres:query");
  private readonly errorDebug = debug("postgres:error");
  private readonly timeDebug = debug("postgres:timing");

  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  constructor(config: PostgresConfig) {
    this.config = config;
    this.dialect = new PostgresDialect();
  }

  public static getInstance(config: DriverConfig): PostgresDriver {
    if (!PostgresDriver.instance) {
      PostgresDriver.instance = new PostgresDriver(config);
    }
    return PostgresDriver.instance;
  }

  async connect(): Promise<void> {
    if (!this.pool) {
      try {
        this.logger.debug("Attempting to connect to PostgreSQL database: ", {
          host: this.config.host,
          port: this.config.port,
          user: this.config.username,
          database: this.config.database,
        });

        this.pool = new Pool({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.username,
          password: this.config.password,
        });
        await this.pool.query("SELECT 1"); // Test connection
        this.logger.info("Successfully connected to PostgreSQL database");
      } catch (error) {
        if (error instanceof Error) {
          // Log error information
          this.logger.error("Connection failed: ", {
            error: error.message,
            stack: error.stack,
          });
          throw new Error(
            "Unable to connect to PostgreSQL database: " + error.message
          );
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        this.logger.debug("Attempting to disconnect from PostgreSQL database");
        await this.pool.end();
        this.logger.info("Disconnected from PostgreSQL database");
        this.pool = null;
      } catch (error) {
        if (error instanceof Error) {
          // Log error information
          this.logger.error("Disconnection failed: ", {
            error: error.message,
            stack: error.stack,
          });
          throw new Error(
            "Unable to disconnect from PostgreSQL database: " + error.message
          );
        }
      }
    }
  }

  async query(query: Query): Promise<any> {
    if (!this.pool) {
      const error = new Error("Not connected to database");
      this.errorDebug("Query failed: %O", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }

    const { sql, params } = this.dialect.buildQuery(query);

    const startTime = Date.now();

    // Log the query details
    this.queryDebug("Executing query: %O", {
      sql,
      params,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.pool.query(sql, params);
      const duration = Date.now() - startTime;

      // Log timing information
      this.timeDebug("Query completed in %dms", duration);
      this.queryDebug("Query result: %O", {
        rowCount: result.rowCount,
        duration,
      });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        // Log error information
        this.errorDebug("Query failed: %O", {
          sql,
          params,
          error: error.message,
          stack: error.stack,
        });
        throw new Error("Database error while executing query: " + sql);
      }
    }
  }

  isConnected(): boolean {
    return this.pool !== null;
  }

  getDialect(): PostgresDialect {
    return this.dialect;
  }
}
