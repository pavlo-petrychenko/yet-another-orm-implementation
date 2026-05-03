import { Client, type ClientConfig } from "pg";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { PostgresConnection, PostgresQueryResponse } from "@/drivers/postgres/connection/PostgresConnection";

export class PostgresClientConnection implements PostgresConnection {
  private readonly client: Client;
  private connected = false;

  constructor(config: PostgresDriverConfig) {
    const clientConfig: ClientConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
    };
    this.client = new Client(clientConfig);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query(sql: string, params: readonly unknown[]): Promise<PostgresQueryResponse> {
    const result = await this.client.query(sql, params as unknown[]);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  withPinnedClient<R>(fn: (pinned: PostgresConnection) => Promise<R>): Promise<R> {
    // Single client is already pinned; reuse `this`.
    return fn(this);
  }
}
