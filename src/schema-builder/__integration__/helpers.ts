import { Pool } from "pg";

import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import { SchemaBuilder } from "@/schema-builder/SchemaBuilder";

export function getEnvConfig(): Omit<PostgresDriverConfig, "mode"> {
  const host = process.env.YAOI_IT_PG_HOST;
  const portRaw = process.env.YAOI_IT_PG_PORT;
  const user = process.env.YAOI_IT_PG_USER;
  const password = process.env.YAOI_IT_PG_PASSWORD;
  const database = process.env.YAOI_IT_PG_DATABASE;
  if (!host || !portRaw || !user || !password || !database) {
    throw new Error("Postgres integration env vars not set.");
  }
  return {
    type: DBType.POSTGRES,
    host,
    port: Number(portRaw),
    user,
    password,
    database,
  };
}

export interface SchemaBuilderFixture {
  getSchema: () => SchemaBuilder;
  getDriver: () => PostgresDriver;
  rawQuery: <T = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ) => Promise<T[]>;
  dropTables: (...names: string[]) => Promise<void>;
}

export function setupSchemaBuilder(): SchemaBuilderFixture {
  let driver: PostgresDriver | undefined;
  let schema: SchemaBuilder | undefined;
  let pool: Pool | undefined;

  beforeAll(() => {
    pool = new Pool(getEnvConfig());
  });
  afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });
  beforeEach(async () => {
    driver = new PostgresDriver({ ...getEnvConfig(), mode: "pool" });
    await driver.connect();
    schema = new SchemaBuilder(driver);
  });
  afterEach(async () => {
    if (driver?.isConnected()) await driver.disconnect();
    driver = undefined;
    schema = undefined;
  });

  return {
    getSchema: (): SchemaBuilder => {
      if (!schema) throw new Error("schema not initialized");
      return schema;
    },
    getDriver: (): PostgresDriver => {
      if (!driver) throw new Error("driver not initialized");
      return driver;
    },
    rawQuery: async <T = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<T[]> => {
      if (!pool) throw new Error("pool not initialized");
      const result = await pool.query(sql, params as unknown[]);
      return result.rows as T[];
    },
    dropTables: async (...names: string[]): Promise<void> => {
      if (!pool) throw new Error("pool not initialized");
      const list = names.map((n) => `"${n}"`).join(", ");
      await pool.query(`DROP TABLE IF EXISTS ${list} CASCADE`);
    },
  };
}
