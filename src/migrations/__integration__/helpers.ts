import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { Pool } from "pg";

import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import { MigrationRunner } from "@/migrations/MigrationRunner";
import { DEFAULT_TABLE_NAME } from "@/migrations/trackingTable";

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

export interface MigrationFixture {
  getDriver: () => PostgresDriver;
  getDir: () => string;
  rawQuery: <T = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ) => Promise<T[]>;
  rowCount: (sql: string, params?: readonly unknown[]) => Promise<number>;
  writeMigration: (fileName: string, content: string) => Promise<void>;
  removeMigration: (fileName: string) => Promise<void>;
  makeRunner: (opts?: { tableName?: string }) => MigrationRunner;
  dropTrackingTable: (tableName?: string) => Promise<void>;
  dropTables: (...names: string[]) => Promise<void>;
}

export function setupMigrationFixture(): MigrationFixture {
  let driver: PostgresDriver | undefined;
  let pool: Pool | undefined;
  let dir: string | undefined;

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
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "yaoi-mig-"));
  });
  afterEach(async () => {
    if (driver?.isConnected()) await driver.disconnect();
    driver = undefined;
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  return {
    getDriver: (): PostgresDriver => {
      if (!driver) throw new Error("driver not initialized");
      return driver;
    },
    getDir: (): string => {
      if (!dir) throw new Error("dir not initialized");
      return dir;
    },
    rawQuery: async <T = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<T[]> => {
      if (!pool) throw new Error("pool not initialized");
      const result = await pool.query(sql, params as unknown[]);
      return result.rows as T[];
    },
    rowCount: async (
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<number> => {
      if (!pool) throw new Error("pool not initialized");
      const result = await pool.query(sql, params as unknown[]);
      return result.rowCount ?? 0;
    },
    writeMigration: async (fileName: string, content: string): Promise<void> => {
      if (!dir) throw new Error("dir not initialized");
      await fs.writeFile(path.join(dir, fileName), content);
    },
    removeMigration: async (fileName: string): Promise<void> => {
      if (!dir) throw new Error("dir not initialized");
      await fs.unlink(path.join(dir, fileName));
    },
    makeRunner: (opts?: { tableName?: string }): MigrationRunner => {
      if (!driver) throw new Error("driver not initialized");
      if (!dir) throw new Error("dir not initialized");
      return new MigrationRunner({
        driver,
        migrationsDir: dir,
        tableName: opts?.tableName,
        fileExtensions: [".js"],
      });
    },
    dropTrackingTable: async (tableName: string = DEFAULT_TABLE_NAME): Promise<void> => {
      if (!pool) throw new Error("pool not initialized");
      await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    },
    dropTables: async (...names: string[]): Promise<void> => {
      if (!pool) throw new Error("pool not initialized");
      const list = names.map((n) => `"${n}"`).join(", ");
      await pool.query(`DROP TABLE IF EXISTS ${list} CASCADE`);
    },
  };
}

export function makeUpDownJs(opts: {
  tableName: string;
  upBody?: string;
  downBody?: string;
}): string {
  const upBody = opts.upBody ?? `await schema.createTable(${JSON.stringify(opts.tableName)}, (t) => { t.id(); t.text("name").notNull(); });`;
  const downBody = opts.downBody ?? `await schema.dropTable(${JSON.stringify(opts.tableName)}, { ifExists: true });`;
  return [
    "exports.up = async function up(schema) {",
    `  ${upBody}`,
    "};",
    "exports.down = async function down(schema) {",
    `  ${downBody}`,
    "};",
    "",
  ].join("\n");
}
