import { makeUpDownJs, setupCliFixture } from "./helpers";

const TABLES = ["cli_d1", "cli_d2"];

describe("yaoi migrate:down (integration)", () => {
  const fx = setupCliFixture();

  beforeEach(async () => {
    await fx.dropTrackingTable();
    await fx.dropTables(...TABLES);
  });

  it("rolls back the most recently applied migration", async () => {
    await fx.writeMigration("001_d1.js", makeUpDownJs({ tableName: "cli_d1" }));
    await fx.writeMigration("002_d2.js", makeUpDownJs({ tableName: "cli_d2" }));
    await fx.cli(["migrate:up"]);

    const result = await fx.cli(["migrate:down"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Rolled back: 002_d2");
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'cli_d2'`)).toBe(0);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'cli_d1'`)).toBe(1);
  });

  it("prints 'Nothing to roll back.' and exits 0 with empty applied set", async () => {
    const result = await fx.cli(["migrate:down"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Nothing to roll back.");
  });

  it("exits 1 with OutOfOrderRollbackError when --name is not the most recent", async () => {
    await fx.writeMigration("001_d1.js", makeUpDownJs({ tableName: "cli_d1" }));
    await fx.writeMigration("002_d2.js", makeUpDownJs({ tableName: "cli_d2" }));
    await fx.cli(["migrate:up"]);

    const result = await fx.cli(["migrate:down", "--name", "001_d1"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/Cannot roll back/);
  });

  it("supports rolling back by --name when it matches the most recent", async () => {
    await fx.writeMigration("001_d1.js", makeUpDownJs({ tableName: "cli_d1" }));
    await fx.writeMigration("002_d2.js", makeUpDownJs({ tableName: "cli_d2" }));
    await fx.cli(["migrate:up"]);

    const result = await fx.cli(["migrate:down", "--name", "002_d2"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Rolled back: 002_d2");
  });
});
