import { makeUpDownJs, setupMigrationFixture } from "./helpers";

const TABLES = ["mig_s1", "mig_s2", "mig_s3"];

describe("MigrationRunner.status (integration)", () => {
  const fx = setupMigrationFixture();

  beforeEach(async () => {
    await fx.dropTrackingTable();
    await fx.dropTables(...TABLES);
  });

  it("returns pending entries for every file when nothing is applied", async () => {
    await fx.writeMigration("001_s1.js", makeUpDownJs({ tableName: "mig_s1" }));
    await fx.writeMigration("002_s2.js", makeUpDownJs({ tableName: "mig_s2" }));

    const status = await fx.makeRunner().status();
    expect(status.map((s) => s.name)).toEqual(["001_s1", "002_s2"]);
    expect(status.every((s) => !s.applied)).toBe(true);
    expect(status.every((s) => s.appliedAt === null)).toBe(true);
    expect(status.every((s) => s.storedChecksum === null)).toBe(true);
    expect(status.every((s) => s.fileChecksum !== null)).toBe(true);
    expect(status.every((s) => !s.mismatch)).toBe(true);
  });

  it("flags applied entries and exposes appliedAt + matching checksums", async () => {
    await fx.writeMigration("001_s1.js", makeUpDownJs({ tableName: "mig_s1" }));
    await fx.writeMigration("002_s2.js", makeUpDownJs({ tableName: "mig_s2" }));

    const runner = fx.makeRunner();
    await runner.up({ to: "001_s1" });

    const status = await runner.status();
    const byName = new Map(status.map((s) => [s.name, s]));
    const s1 = byName.get("001_s1");
    expect(s1?.applied).toBe(true);
    expect(s1?.appliedAt).toBeInstanceOf(Date);
    expect(s1?.storedChecksum).toBe(s1?.fileChecksum);
    expect(s1?.mismatch).toBe(false);
    expect(byName.get("002_s2")?.applied).toBe(false);
  });

  it("includes orphans (applied row, no file) with fileChecksum=null and mismatch=false", async () => {
    await fx.writeMigration("001_s1.js", makeUpDownJs({ tableName: "mig_s1" }));
    const runner = fx.makeRunner();
    await runner.up();
    await fx.removeMigration("001_s1.js");

    const status = await runner.status();
    expect(status).toHaveLength(1);
    expect(status[0].name).toBe("001_s1");
    expect(status[0].applied).toBe(true);
    expect(status[0].fileChecksum).toBeNull();
    expect(status[0].mismatch).toBe(false);
  });

  it("flags mismatch=true when the on-disk file differs from the stored checksum", async () => {
    await fx.writeMigration("001_s1.js", makeUpDownJs({ tableName: "mig_s1" }));
    const runner = fx.makeRunner();
    await runner.up();
    await fx.writeMigration(
      "001_s1.js",
      makeUpDownJs({ tableName: "mig_s1", upBody: "/* edited */" }),
    );

    const status = await runner.status();
    expect(status).toHaveLength(1);
    expect(status[0].mismatch).toBe(true);
    expect(status[0].storedChecksum).not.toBe(status[0].fileChecksum);
  });
});
