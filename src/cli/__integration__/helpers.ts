import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { Pool } from "pg";

import { DEFAULT_TABLE_NAME } from "@/migrations/trackingTable";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const BIN_PATH = path.join(REPO_ROOT, "bin", "yaoi.ts");
const NODE_MODULES = path.join(REPO_ROOT, "node_modules");
const TS_NODE_REGISTER = path.join(NODE_MODULES, "ts-node", "register", "transpile-only.js");
const TSCONFIG_PATHS_REGISTER = path.join(NODE_MODULES, "tsconfig-paths", "register.js");

export interface PgEnv {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getPgEnv(): PgEnv {
  const host = process.env.YAOI_IT_PG_HOST;
  const portRaw = process.env.YAOI_IT_PG_PORT;
  const user = process.env.YAOI_IT_PG_USER;
  const password = process.env.YAOI_IT_PG_PASSWORD;
  const database = process.env.YAOI_IT_PG_DATABASE;
  if (!host || !portRaw || !user || !password || !database) {
    throw new Error("Postgres integration env vars not set.");
  }
  return { host, port: Number(portRaw), user, password, database };
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function runCli(
  args: readonly string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv } = { cwd: REPO_ROOT },
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "-r",
        TS_NODE_REGISTER,
        "-r",
        TSCONFIG_PATHS_REGISTER,
        BIN_PATH,
        ...args,
      ],
      {
        cwd: opts.cwd,
        env: {
          ...process.env,
          TS_NODE_PROJECT: path.join(REPO_ROOT, "tsconfig.json"),
          ...(opts.env ?? {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const chunksOut: Buffer[] = [];
    const chunksErr: Buffer[] = [];
    child.stdout.on("data", (b: Buffer) => chunksOut.push(b));
    child.stderr.on("data", (b: Buffer) => chunksErr.push(b));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(chunksOut).toString("utf8"),
        stderr: Buffer.concat(chunksErr).toString("utf8"),
        exitCode: code ?? 0,
      });
    });
  });
}

export interface CliFixture {
  getCwd: () => string;
  getMigrationsDir: () => string;
  rawQuery: <T = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ) => Promise<T[]>;
  rowCount: (sql: string, params?: readonly unknown[]) => Promise<number>;
  writeMigration: (fileName: string, content: string) => Promise<void>;
  removeMigration: (fileName: string) => Promise<void>;
  dropTrackingTable: (tableName?: string) => Promise<void>;
  dropTables: (...names: string[]) => Promise<void>;
  cli: (args: readonly string[]) => Promise<CliResult>;
}

export function setupCliFixture(): CliFixture {
  let pool: Pool | undefined;
  let cwd: string | undefined;
  let migrationsDir: string | undefined;

  beforeAll(() => {
    pool = new Pool(getPgEnv());
  });
  afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), "yaoi-cli-"));
    migrationsDir = path.join(cwd, "migrations");
    await fs.mkdir(migrationsDir, { recursive: true });

    const env = getPgEnv();
    const cfg = `
module.exports = {
  driver: {
    type: "postgres",
    mode: "pool",
    host: ${JSON.stringify(env.host)},
    port: ${String(env.port)},
    user: ${JSON.stringify(env.user)},
    password: ${JSON.stringify(env.password)},
    database: ${JSON.stringify(env.database)},
  },
  migrationsDir: "./migrations",
  fileExtensions: [".js"],
};
`;
    await fs.writeFile(path.join(cwd, "yaoi.config.js"), cfg);
  });

  afterEach(async () => {
    if (cwd) {
      await fs.rm(cwd, { recursive: true, force: true });
      cwd = undefined;
      migrationsDir = undefined;
    }
  });

  return {
    getCwd: (): string => {
      if (!cwd) throw new Error("cwd not initialized");
      return cwd;
    },
    getMigrationsDir: (): string => {
      if (!migrationsDir) throw new Error("migrationsDir not initialized");
      return migrationsDir;
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
      if (!migrationsDir) throw new Error("migrationsDir not initialized");
      await fs.writeFile(path.join(migrationsDir, fileName), content);
    },
    removeMigration: async (fileName: string): Promise<void> => {
      if (!migrationsDir) throw new Error("migrationsDir not initialized");
      await fs.unlink(path.join(migrationsDir, fileName));
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
    cli: (args: readonly string[]): Promise<CliResult> => {
      if (!cwd) throw new Error("cwd not initialized");
      return runCli(args, { cwd });
    },
  };
}

export function makeUpDownJs(opts: {
  tableName: string;
  upBody?: string;
  downBody?: string;
}): string {
  const upBody = opts.upBody
    ?? `await schema.createTable(${JSON.stringify(opts.tableName)}, (t) => { t.id(); t.text("name").notNull(); });`;
  const downBody = opts.downBody
    ?? `await schema.dropTable(${JSON.stringify(opts.tableName)}, { ifExists: true });`;
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
