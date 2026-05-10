import {
  ChecksumMismatchError,
  MissingMigrationFileError,
} from "@/migrations/errors";

import { makeUpDownJs, setupMigrationFixture } from "./helpers";

const TABLES = ["mig_c1", "mig_c2"];

describe("MigrationRunner checksum enforcement (integration)", () => {
  const fx = setupMigrationFixture();

  beforeEach(async () => {
    await fx.dropTrackingTable();
    await fx.dropTables(...TABLES);
  });

  it("up() throws ChecksumMismatchError when an applied migration's file is edited", async () => {
    await fx.writeMigration("001_c1.js", makeUpDownJs({ tableName: "mig_c1" }));
    await fx.writeMigration("002_c2.js", makeUpDownJs({ tableName: "mig_c2" }));
    const runner = fx.makeRunner();
    await runner.up({ to: "001_c1" });

    await fx.writeMigration(
      "001_c1.js",
      makeUpDownJs({ tableName: "mig_c1", upBody: "/* tampered */" }),
    );

    await expect(runner.up()).rejects.toBeInstanceOf(ChecksumMismatchError);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_c2'`)).toBe(0);
  });

  it("up() throws MissingMigrationFileError when an applied migration's file has been deleted", async () => {
    await fx.writeMigration("001_c1.js", makeUpDownJs({ tableName: "mig_c1" }));
    const runner = fx.makeRunner();
    await runner.up();
    await fx.removeMigration("001_c1.js");

    await expect(runner.up()).rejects.toBeInstanceOf(MissingMigrationFileError);
  });

  it("down() throws ChecksumMismatchError when the migration to roll back has been edited", async () => {
    await fx.writeMigration("001_c1.js", makeUpDownJs({ tableName: "mig_c1" }));
    const runner = fx.makeRunner();
    await runner.up();

    await fx.writeMigration(
      "001_c1.js",
      makeUpDownJs({ tableName: "mig_c1", upBody: "/* tampered */" }),
    );

    await expect(runner.down()).rejects.toBeInstanceOf(ChecksumMismatchError);
    expect(await fx.rowCount(`SELECT 1 FROM information_schema.tables WHERE table_name = 'mig_c1'`)).toBe(1);
  });

  it("down() throws MissingMigrationFileError when the migration file is gone", async () => {
    await fx.writeMigration("001_c1.js", makeUpDownJs({ tableName: "mig_c1" }));
    const runner = fx.makeRunner();
    await runner.up();
    await fx.removeMigration("001_c1.js");

    await expect(runner.down()).rejects.toBeInstanceOf(MissingMigrationFileError);
  });
});
