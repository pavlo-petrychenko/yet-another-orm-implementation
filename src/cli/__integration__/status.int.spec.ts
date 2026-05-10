import { promises as fsp } from "node:fs";
import path from "node:path";

import { makeUpDownJs, setupCliFixture } from "./helpers";

const TABLES = ["cli_s1", "cli_s2"];

describe("yaoi migrate:status (integration)", () => {
  const fx = setupCliFixture();

  beforeEach(async () => {
    await fx.dropTrackingTable();
    await fx.dropTables(...TABLES);
  });

  it("renders the header alone when there are no migrations and no tracking rows", async () => {
    const result = await fx.cli(["migrate:status"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("STATE");
    expect(result.stdout).toContain("NAME");
    expect(result.stdout).not.toMatch(/applied|pending|orphan/);
  });

  it("renders applied + pending rows after a partial up", async () => {
    await fx.writeMigration("001_s1.js", makeUpDownJs({ tableName: "cli_s1" }));
    await fx.writeMigration("002_s2.js", makeUpDownJs({ tableName: "cli_s2" }));
    await fx.cli(["migrate:up", "--to", "001_s1"]);

    const result = await fx.cli(["migrate:status"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("applied");
    expect(result.stdout).toContain("001_s1");
    expect(result.stdout).toContain("pending");
    expect(result.stdout).toContain("002_s2");
  });

  it("renders MISMATCH=YES after the file has been edited", async () => {
    await fx.writeMigration("001_s1.js", makeUpDownJs({ tableName: "cli_s1" }));
    await fx.cli(["migrate:up"]);
    await fx.writeMigration(
      "001_s1.js",
      makeUpDownJs({ tableName: "cli_s1", upBody: "/* tampered */" }),
    );

    const result = await fx.cli(["migrate:status"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("YES");
  });

  it("exits 3 when no yaoi.config exists", async () => {
    await fsp.unlink(path.join(fx.getCwd(), "yaoi.config.js"));
    const result = await fx.cli(["migrate:status"]);
    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain("Could not find a yaoi config file");
  });
});
