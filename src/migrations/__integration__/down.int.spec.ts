import { OutOfOrderRollbackError } from "@/migrations/errors";

import { makeUpDownJs, setupMigrationFixture } from "./helpers";

const TABLES = ["mig_d1", "mig_d2", "mig_d3"];

describe("MigrationRunner.down (integration)", () => {
  const fx = setupMigrationFixture();

  beforeEach(async () => {
    await fx.dropTrackingTable();
    await fx.dropTables(...TABLES);
  });

  it("rolls back the most recently applied migration when called with no name", async () => {
    await fx.writeMigration("001_d1.js", makeUpDownJs({ tableName: "mig_d1" }));
    await fx.writeMigration("002_d2.js", makeUpDownJs({ tableName: "mig_d2" }));
    await fx.writeMigration("003_d3.js", makeUpDownJs({ tableName: "mig_d3" }));

    const runner = fx.makeRunner();
    await runner.up();

    const result = await runner.down();
    expect(result.rolledBack).toBe("003_d3");

    const remaining = await fx.rawQuery<{ name: string }>(
      `SELECT name FROM "yaoi_migrations" ORDER BY name`,
    );
    expect(remaining.map((r) => r.name)).toEqual(["001_d1", "002_d2"]);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_d3'`)).toBe(0);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_d2'`)).toBe(1);
  });

  it("returns rolledBack: null when nothing has been applied", async () => {
    const runner = fx.makeRunner();
    const result = await runner.down();
    expect(result.rolledBack).toBeNull();
  });

  it("rejects rolling back a non-most-recent migration with OutOfOrderRollbackError", async () => {
    await fx.writeMigration("001_d1.js", makeUpDownJs({ tableName: "mig_d1" }));
    await fx.writeMigration("002_d2.js", makeUpDownJs({ tableName: "mig_d2" }));

    const runner = fx.makeRunner();
    await runner.up();

    await expect(runner.down({ name: "001_d1" })).rejects.toBeInstanceOf(OutOfOrderRollbackError);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_d1'`)).toBe(1);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_d2'`)).toBe(1);
  });

  it("supports rolling back by name when the name matches the most recent", async () => {
    await fx.writeMigration("001_d1.js", makeUpDownJs({ tableName: "mig_d1" }));
    await fx.writeMigration("002_d2.js", makeUpDownJs({ tableName: "mig_d2" }));

    const runner = fx.makeRunner();
    await runner.up();

    const result = await runner.down({ name: "002_d2" });
    expect(result.rolledBack).toBe("002_d2");
  });
});
