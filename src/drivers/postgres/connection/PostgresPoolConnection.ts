import { Pool, type PoolConfig } from "pg";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { PostgresConnection, PostgresQueryResponse } from "@/drivers/postgres/connection/PostgresConnection";

export class PostgresPoolConnection implements PostgresConnection {
  private readonly pool: Pool;
  private connected = false;

  constructor(config: PostgresDriverConfig) {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
      max: config.pool?.max,
    };
    this.pool = new Pool(poolConfig);
  }

  async connect(): Promise<void> {
    // Pool itself is lazy; issue a ping so connect() reliably surfaces connectivity errors.
    await this.pool.query("SELECT 1");
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query(sql: string, params: readonly unknown[]): Promise<PostgresQueryResponse> {
    const result = await this.pool.query(sql, params as unknown[]);
    return { rows: result.rows, rowCount: result.rowCount };
  }
}
