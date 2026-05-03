import { getEnvConfig } from "@/drivers/postgres/__integration__/helpers";
import { DataSource } from "@/model/DataSource";
import {
  clearDataSource,
  setDataSource,
} from "@/model/dataSourceRegistry";
import { repositoryRegistry } from "@/model/repositoryRegistry";
import { Pool } from "pg";

export interface ModelFixture {
  getDataSource(): DataSource;
  rawQuery<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  truncateAll(): Promise<void>;
}

export function setupModelFixture(): ModelFixture {
  let ds: DataSource | undefined;
  let pool: Pool | undefined;

  beforeAll(async () => {
    pool = new Pool(getEnvConfig());
    ds = new DataSource({ driver: { ...getEnvConfig(), mode: "pool" } });
    await ds.initialize();
    setDataSource(ds);
  });

  afterAll(async () => {
    if (ds) {
      await ds.destroy();
      ds = undefined;
    }
    if (pool) {
      await pool.end();
      pool = undefined;
    }
    clearDataSource();
    repositoryRegistry.clear();
  });

  beforeEach(async () => {
    if (!pool) throw new Error("pool not initialized");
    await pool.query("TRUNCATE model_post_tags, model_posts, model_tags, model_orders, model_profiles, model_accounts, model_users RESTART IDENTITY CASCADE");
  });

  return {
    getDataSource: (): DataSource => {
      if (!ds) throw new Error("DataSource not initialized");
      return ds;
    },
    rawQuery: async <T = Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
    ): Promise<T[]> => {
      if (!pool) throw new Error("pool not initialized");
      const result = await pool.query(sql, params as unknown[]);
      return result.rows as T[];
    },
    truncateAll: async (): Promise<void> => {
      if (!pool) throw new Error("pool not initialized");
      await pool.query("TRUNCATE model_post_tags, model_posts, model_tags, model_orders, model_profiles, model_accounts, model_users RESTART IDENTITY CASCADE");
    },
  };
}
