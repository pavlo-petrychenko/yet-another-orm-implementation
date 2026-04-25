import type { DBType } from "@/drivers/types/DBType";

export interface PostgresDriverConfig {
  type: DBType.POSTGRES;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean | Record<string, unknown>;
  pool?: { min?: number; max?: number };
  mode?: "pool" | "client";
}

export interface MySqlDriverConfig {
  type: DBType.MYSQL;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  pool?: { min?: number; max?: number };
}

export interface SqliteDriverConfig {
  type: DBType.SQLITE;
  filename: string;
}

export type DriverConfig =
  | PostgresDriverConfig
  | MySqlDriverConfig
  | SqliteDriverConfig;
