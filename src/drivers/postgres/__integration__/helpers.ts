import { Pool } from "pg";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";

export function getEnvConfig(): Omit<PostgresDriverConfig, "mode"> {
  const host = process.env.YAOI_IT_PG_HOST;
  const portRaw = process.env.YAOI_IT_PG_PORT;
  const user = process.env.YAOI_IT_PG_USER;
  const password = process.env.YAOI_IT_PG_PASSWORD;
  const database = process.env.YAOI_IT_PG_DATABASE;

  if (!host || !portRaw || !user || !password || !database) {
    throw new Error(
      "Postgres integration env vars not set. Run via `npm run test:integration` so globalSetup boots the container.",
    );
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

export interface PostgresDriverFixture {
  getDriver(): PostgresDriver;
  rawQuery<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
}

export function setupDriver(mode: "pool" | "client"): PostgresDriverFixture {
  let driver: PostgresDriver | undefined;
  let fixture: Pool | undefined;

  beforeAll(() => {
    fixture = new Pool(getEnvConfig());
  });
  afterAll(async () => {
    if (fixture) {
      await fixture.end();
      fixture = undefined;
    }
  });
  beforeEach(async () => {
    if (!fixture) throw new Error("fixture pool not initialized");
    await fixture.query("TRUNCATE users, orders RESTART IDENTITY CASCADE");
    driver = new PostgresDriver({ ...getEnvConfig(), mode });
    await driver.connect();
  });
  afterEach(async () => {
    if (driver?.isConnected()) {
      await driver.disconnect();
    }
    driver = undefined;
  });

  return {
    getDriver: (): PostgresDriver => {
      if (!driver) throw new Error("driver not initialized");
      return driver;
    },
    rawQuery: async <T = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<T[]> => {
      if (!fixture) throw new Error("fixture pool not initialized");
      const result = await fixture.query(sql, params as unknown[]);
      return result.rows as T[];
    },
  };
}
