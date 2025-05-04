import { Driver } from "../common/Driver";
import { DriverConfig } from "../common/DriverConfig";
import { Pool, createPool } from "mysql2/promise";
import { MySqlDialect } from "@/drivers/mysql/dialect/MySqlDialect";
import { Dialect } from "@/drivers/common/Dialect";
import { Query } from "@/query-builder/queries/Query";
import pino from "pino";

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
          this.logger.error(
            {
              error: error.message,
              stack: error.stack,
            },
            "Connection failed"
          );
          throw new Error(
            "Unable to connect to MySQL database: " + error.message
          );
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.logger.info("Disconnected from MySQL database");
        this.pool = null;
      } catch (error) {
        if (error instanceof Error) {
          // Log error information
          this.logger.error(
            {
              error: error.message,
              stack: error.stack,
            },
            "Disconnection failed"
          );
          throw new Error(
            "Unable to disconnect from MySQL database: " + error.message
          );
        }
      }
    }
  }

  async query(query: Query): Promise<any> {
    if (!this.pool) {
      throw new Error("Not connected to database");
    }

    const { sql, params } = this.dialect.buildQuery(query);

    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  isConnected(): boolean {
    return this.pool !== null;
  }

  getDialect(): Dialect {
    return this.dialect;
  }
}