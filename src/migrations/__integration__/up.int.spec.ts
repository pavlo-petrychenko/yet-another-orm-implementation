import { Pool } from "pg";

import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";
import { MigrationRunner } from "@/migrations/MigrationRunner";

import { getEnvConfig, makeUpDownJs, setupMigrationFixture } from "./helpers";

const TABLES = ["mig_t1", "mig_t2", "mig_t3"];

describe("MigrationRunner.up (integration)", () => {
  const fx = setupMigrationFixture();

  beforeEach(async () => {
    await fx.dropTrackingTable();
    await fx.dropTables(...TABLES, ...TABLES.map((t) => `${t}_dup`));
  });

  it("creates the tracking table on first run and applies pending in order", async () => {
    await fx.writeMigration("001_t1.js", makeUpDownJs({ tableName: "mig_t1" }));
    await fx.writeMigration("002_t2.js", makeUpDownJs({ tableName: "mig_t2" }));
    await fx.writeMigration("003_t3.js", makeUpDownJs({ tableName: "mig_t3" }));

    const runner = fx.makeRunner();
    const result = await runner.up();
    expect(result.applied).toEqual(["001_t1", "002_t2", "003_t3"]);

    const rows = await fx.rawQuery<{ name: string; checksum: string }>(
      `SELECT name, checksum FROM "yaoi_migrations" ORDER BY name ASC`,
    );
    expect(rows.map((r) => r.name)).toEqual(["001_t1", "002_t2", "003_t3"]);
    for (const r of rows) expect(r.checksum).toMatch(/^[0-9a-f]{64}$/);

    for (const t of TABLES) {
      expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [t])).toBe(1);
    }
  });

  it("re-running up() after a successful run is a no-op", async () => {
    await fx.writeMigration("001_t1.js", makeUpDownJs({ tableName: "mig_t1" }));
    const runner = fx.makeRunner();
    await runner.up();
    const second = await runner.up();
    expect(second.applied).toEqual([]);
  });

  it("rolls the entire migration tx back when up() throws — no tracking row, no schema change", async () => {
    const breakingUp = `
exports.up = async function up(schema) {
  await schema.createTable("mig_t1", (t) => { t.id(); });
  throw new Error("boom");
};
exports.down = async function down(schema) {
  await schema.dropTable("mig_t1", { ifExists: true });
};
`;
    await fx.writeMigration("001_t1.js", breakingUp);
    const runner = fx.makeRunner();
    await expect(runner.up()).rejects.toThrow("boom");

    const rows = await fx.rawQuery(`SELECT 1 FROM "yaoi_migrations"`);
    expect(rows).toHaveLength(0);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_t1'`)).toBe(0);
  });

  it("up({ to: '002_t2' }) applies only through 002 and leaves 003 pending", async () => {
    await fx.writeMigration("001_t1.js", makeUpDownJs({ tableName: "mig_t1" }));
    await fx.writeMigration("002_t2.js", makeUpDownJs({ tableName: "mig_t2" }));
    await fx.writeMigration("003_t3.js", makeUpDownJs({ tableName: "mig_t3" }));

    const runner = fx.makeRunner();
    const result = await runner.up({ to: "002_t2" });
    expect(result.applied).toEqual(["001_t1", "002_t2"]);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_t3'`)).toBe(0);
  });

  it("two parallel up() runners both succeed but apply each migration exactly once", async () => {
    await fx.writeMigration("001_t1.js", makeUpDownJs({ tableName: "mig_t1" }));

    const config = getEnvConfig();
    const driverA = new PostgresDriver({ ...config, mode: "pool" });
    const driverB = new PostgresDriver({ ...config, mode: "pool" });
    await driverA.connect();
    await driverB.connect();
    try {
      const runnerA = new MigrationRunner({
        driver: driverA,
        migrationsDir: fx.getDir(),
        fileExtensions: [".js"],
      });
      const runnerB = new MigrationRunner({
        driver: driverB,
        migrationsDir: fx.getDir(),
        fileExtensions: [".js"],
      });
      const [a, b] = await Promise.all([runnerA.up(), runnerB.up()]);
      const totalApplied = a.applied.length + b.applied.length;
      expect(totalApplied).toBe(1);

      const adminPool = new Pool(config);
      try {
        const result = await adminPool.query(`SELECT name FROM "yaoi_migrations" ORDER BY name`);
        expect(result.rows.map((r: { name: string }) => r.name)).toEqual(["001_t1"]);
      } finally {
        await adminPool.end();
      }
    } finally {
      await driverA.disconnect();
      await driverB.disconnect();
    }
  });
});
