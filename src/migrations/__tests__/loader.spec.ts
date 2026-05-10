import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { InvalidMigrationFileError } from "@/migrations/errors";
import { discoverMigrations } from "@/migrations/loader";

describe("discoverMigrations", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yaoi-loader-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns an empty array for an empty directory", async () => {
    const out = await discoverMigrations(tmpDir);
    expect(out).toEqual([]);
  });

  it("sorts files lexicographically and strips extensions", async () => {
    await fs.writeFile(path.join(tmpDir, "002_b.js"), "module.exports = {};");
    await fs.writeFile(path.join(tmpDir, "001_a.js"), "module.exports = {};");
    await fs.writeFile(path.join(tmpDir, "010_c.js"), "module.exports = {};");

    const out = await discoverMigrations(tmpDir, [".js"]);
    expect(out.map((m) => m.name)).toEqual(["001_a", "002_b", "010_c"]);
  });

  it("skips files outside the configured extensions", async () => {
    await fs.writeFile(path.join(tmpDir, "001_a.js"), "module.exports = {};");
    await fs.writeFile(path.join(tmpDir, "README.md"), "ignore me");
    await fs.writeFile(path.join(tmpDir, "schema.sql"), "ignore me");

    const out = await discoverMigrations(tmpDir, [".js"]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("001_a");
  });

  it("skips .d.ts and .spec/.test files even when .ts is allowed", async () => {
    await fs.writeFile(path.join(tmpDir, "001_real.ts"), "export const up = async () => {}; export const down = async () => {};");
    await fs.writeFile(path.join(tmpDir, "001_real.d.ts"), "");
    await fs.writeFile(path.join(tmpDir, "002_thing.spec.ts"), "");
    await fs.writeFile(path.join(tmpDir, "003_thing.test.ts"), "");

    const out = await discoverMigrations(tmpDir, [".ts"]);
    expect(out.map((m) => m.name)).toEqual(["001_real"]);
  });

  it("load() rejects modules missing up/down with InvalidMigrationFileError", async () => {
    const file = path.join(tmpDir, "001_bad.js");
    await fs.writeFile(file, "module.exports = { up: async () => {} };");

    const [discovered] = await discoverMigrations(tmpDir, [".js"]);
    await expect(discovered.load()).rejects.toBeInstanceOf(InvalidMigrationFileError);
  });

  it("load() resolves a valid CJS migration to a Migration shape", async () => {
    const file = path.join(tmpDir, "001_ok.js");
    await fs.writeFile(
      file,
      "module.exports = { up: async () => {}, down: async () => {} };",
    );

    const [discovered] = await discoverMigrations(tmpDir, [".js"]);
    const migration = await discovered.load();
    expect(typeof migration.up).toBe("function");
    expect(typeof migration.down).toBe("function");
  });
});
