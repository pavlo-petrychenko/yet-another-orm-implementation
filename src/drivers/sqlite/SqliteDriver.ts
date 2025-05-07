import { Driver } from "../common/Driver";
import { SqliteDriverConfig } from "./SqliteConfig";
import { Database } from "sqlite3";
// import { SqliteDialect } from "@/drivers/sqlite/dialect/SqliteDialect";
// import { Dialect } from "@/drivers/common/Dialect";
// import { Query } from "@/query-builder/queries/Query";
import pino from "pino";
import {SqliteDialect} from "./dialect/SqliteDialect";
import {Query} from "../../query-builder/queries/Query";
import {Dialect} from "../common/Dialect";
// import {SqliteDialect} from "drivers/sqlite/dialect/SqliteDialect";
// import {Query} from "query-builder/queries/Query";
// import {Dialect} from "drivers/common/Dialect";

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
      {
        file: this.config.filename,
      },
      "Attempting to connect to SQLite database: "
    );
    return new Promise((resolve, reject) => {
      if (!this.db) {
        this.db = new Database(this.config.filename, (err) => {
          if (err) {
            this.logger.error("Connection failed: ", {
              error: err.message,
              stack: err.stack,
            });
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
            this.logger.error("Disconnection failed: ", {
              error: err.message,
              stack: err.stack,
            });
            reject(new Error("Could not disconnect from SQLite database"));
          } else {
            this.logger.info("Disconnected from SQLite database");
            this.db = null;
            resolve();
          }
        });
      } else {
        this.logger.debug("There is no active connection to SQLite database");
        resolve();
      }
    });
  }

  async query(query: Query): Promise<any> {
    if (this.db === null) {
      const err = new Error("Not connected to database");
      this.logger.error("Query failed: ", {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }

    const { sql, params } = this.dialect.buildQuery(query);

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

    return new Promise((resolve, reject) => {
      const callback = (err: Error | null, rows: any) => {
        const duration = Date.now() - startTime;

        if (err) {
          // Log error information
          this.logger.error("Query failed: ", {
            sql,
            params,
            error: err.message,
            stack: err.stack,
          });
          reject(new Error("Database error while executing query: " + sql));
        } else {
          this.logger.debug("Query completed in %dms", duration);
          this.logger.debug(
            {
              rows: Array.isArray(rows) ? rows.length : undefined,
              duration,
            },
            "Query result: "
          );
          resolve(rows);
        }
      };

      if (this.db === null) {
        const err = new Error("Not connected to database");
        this.logger.error("Query failed: ", {
          error: err.message,
          stack: err.stack,
        });
        throw err;
      }

      try {
        if (sql.trim().toUpperCase().startsWith("SELECT")) {
          this.db.all(sql, params || [], callback);
        } else {
          this.db.run(sql, params || [], callback);
        }
      } catch (err: any) {
        this.logger.error("Unexpected error during query dispatch: ", {
          sql,
          error: err.message,
          stack: err.stack,
        });
        reject(new Error("Unexpected SQLite driver error"));
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
