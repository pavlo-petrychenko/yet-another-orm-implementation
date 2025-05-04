import { Driver } from "../common/Driver";
import { SqliteDriverConfig } from "./SqliteConfig";
import { Database } from "sqlite3";
import { SqliteDialect } from "@/drivers/sqlite/dialect/SqliteDialect";
import { Dialect } from "@/drivers/common/Dialect";
import { Query } from "@/query-builder/queries/Query";
import pino from "pino";

export class SqliteDriver implements Driver {
  private static instance: SqliteDriver | null = null;
  private db: Database | null = null;
  private config: SqliteDriverConfig;
  private readonly dialect: SqliteDialect;

  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  private constructor(config: SqliteDriverConfig) {
    this.config = config;
    this.dialect = new SqliteDialect();
  }

  public static getInstance(config: SqliteDriverConfig): SqliteDriver {
    if (!SqliteDriver.instance) {
      SqliteDriver.instance = new SqliteDriver(config);
    }
    return SqliteDriver.instance;
  }

  async connect(): Promise<void> {
    this.logger.debug(
      { file: this.config.filename },
      "Attempting to connect to SQLite database"
    );
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.db = new Database(this.config.filename, (err) => {
          if (err) {
            this.logger.error(
              {
                error: err.message,
                stack: err.stack,
              },
              "Connection failed"
            );
            reject(new Error("Could not connect to SQLite database"));
          } else {
            this.logger.info("Successfully connected to SQLite database");
            resolve();
          }
        });
      } else {
        this.logger.debug("Already connected to SQLite database");
        resolve();
      }
    });
  }

  async disconnect(): Promise<void> {
    this.logger.debug("Attempting to disconnect from SQLite database");
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            this.logger.error(
              {
                error: err.message,
                stack: err.stack,
              },
              "Disconnection failed"
            );
            reject(new Error("Could not disconnect from SQLite database"));
          } else {
            this.logger.info("Disconnected from SQLite database");
            this.db = null;
            resolve();
          }
        });
      } else {
        this.logger.debug(
          "No active connection to SQLite database is detected"
        );
        resolve();
      }
    });
  }

  async query(query: Query): Promise<any> {
    if (this.db === null) {
      throw new Error("Not connected to database");
    }

    const { sql, params } = this.dialect.buildQuery(query);

    return new Promise((resolve, reject) => {
      const callback = (err: Error | null, rows: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      };

      if (this.db === null) {
        throw new Error("Not connected to database");
      }

      if (sql.trim().toUpperCase().startsWith("SELECT")) {
        this.db.all(sql, params || [], callback);
      } else {
        this.db.run(sql, params || [], callback);
      }
    });
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  getDialect(): Dialect {
    return this.dialect;
  }
}
