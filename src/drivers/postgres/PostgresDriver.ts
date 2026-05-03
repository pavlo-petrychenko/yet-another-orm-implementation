import type { Query } from "@/query-builder";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import type { QueryResult } from "@/drivers/types/QueryResult";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import { PostgresDialect } from "@/drivers/postgres/dialect/PostgresDialect";
import type { PostgresConnection } from "@/drivers/postgres/connection/PostgresConnection";
import { PostgresPoolConnection } from "@/drivers/postgres/connection/PostgresPoolConnection";
import { PostgresClientConnection } from "@/drivers/postgres/connection/PostgresClientConnection";

export class PostgresDriver implements Driver {
  private readonly dialect: PostgresDialect;
  private readonly connection: PostgresConnection;

  constructor(config: PostgresDriverConfig) {
    this.dialect = new PostgresDialect();
    this.connection = (config.mode ?? "pool") === "client"
      ? new PostgresClientConnection(config)
      : new PostgresPoolConnection(config);
  }

  connect(): Promise<void> {
    return this.connection.connect();
  }

  disconnect(): Promise<void> {
    return this.connection.disconnect();
  }

  isConnected(): boolean {
    return this.connection.isConnected();
  }

  getDialect(): Dialect {
    return this.dialect;
  }

  async query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>> {
    const compiled = this.dialect.buildQuery(query);
    const result = await this.connection.query(compiled.sql, compiled.params);
    return {
      rows: result.rows as TRow[],
      rowCount: result.rowCount ?? 0,
    };
  }

  async raw<TRow = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<QueryResult<TRow>> {
    const result = await this.connection.query(sql, params);
    return {
      rows: result.rows as TRow[],
      rowCount: result.rowCount ?? 0,
    };
  }
}
