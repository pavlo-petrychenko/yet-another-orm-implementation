import { makeUpDownJs, setupCliFixture } from "./helpers";

const TABLES = ["cli_u1", "cli_u2", "cli_u3"];

describe("yaoi migrate:up (integration)", () => {
  const fx = setupCliFixture();

  beforeEach(async () => {
    await fx.dropTrackingTable();
    await fx.dropTables(...TABLES);
  });

  it("applies pending migrations in order and exits 0", async () => {
    await fx.writeMigration("001_u1.js", makeUpDownJs({ tableName: "cli_u1" }));
    await fx.writeMigration("002_u2.js", makeUpDownJs({ tableName: "cli_u2" }));

    const result = await fx.cli(["migrate:up"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Applied: 001_u1");
    expect(result.stderr).toContain("Applied: 002_u2");

    const rows = await fx.rawQuery<{ name: string }>(
      `SELECT name FROM "yaoi_migrations" ORDER BY name`,
    );
    expect(rows.map((r) => r.name)).toEqual(["001_u1", "002_u2"]);
  });

  it("reports no pending when everything is applied", async () => {
    await fx.writeMigration("001_u1.js", makeUpDownJs({ tableName: "cli_u1" }));
    await fx.cli(["migrate:up"]);

    const second = await fx.cli(["migrate:up"]);
    expect(second.exitCode).toBe(0);
    expect(second.stderr).toContain("No pending migrations.");
  });

  it("--to truncates the apply set", async () => {
    await fx.writeMigration("001_u1.js", makeUpDownJs({ tableName: "cli_u1" }));
    await fx.writeMigration("002_u2.js", makeUpDownJs({ tableName: "cli_u2" }));
    await fx.writeMigration("003_u3.js", makeUpDownJs({ tableName: "cli_u3" }));

    const result = await fx.cli(["migrate:up", "--to", "002_u2"]);
    expect(result.exitCode).toBe(0);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'cli_u3'`)).toBe(0);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'cli_u2'`)).toBe(1);
  });

  it("exits 1 when a migration throws and leaves no tracking row behind", async () => {
    const bad = `
exports.up = async function up(schema) {
  await schema.createTable("cli_u1", (t) => { t.id(); });
  throw new Error("boom-from-cli");
};
exports.down = async function down(schema) {
  await schema.dropTable("cli_u1", { ifExists: true });
};
`;
    await fx.writeMigration("001_u1.js", bad);
    const result = await fx.cli(["migrate:up"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("boom-from-cli");
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'cli_u1'`)).toBe(0);
  });

  it("exits 2 when --to has no value", async () => {
    const result = await fx.cli(["migrate:up", "--to"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("--to requires a migration name");
  });
});
