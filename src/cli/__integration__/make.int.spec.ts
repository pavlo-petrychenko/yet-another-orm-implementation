import { promises as fs } from "node:fs";
import path from "node:path";

import { setupCliFixture } from "./helpers";

describe("yaoi migrate:make (integration)", () => {
  const fx = setupCliFixture();

  it("creates a migration file with a timestamp_slug.ts name", async () => {
    const result = await fx.cli(["migrate:make", "AddPosts"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("Created migration:");
    expect(result.stdout.trim()).toMatch(/\.ts$/);

    const entries = await fs.readdir(fx.getMigrationsDir());
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^\d{14}_addposts\.ts$/);

    const content = await fs.readFile(path.join(fx.getMigrationsDir(), entries[0]), "utf8");
    expect(content).toContain("async up");
    expect(content).toContain("async down");
    expect(content).toContain("export default migration");
  });

  it("exits 2 when no name is provided", async () => {
    const result = await fx.cli(["migrate:make"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("migrate:make requires a migration name");
  });

  it("creates the migrations dir if missing", async () => {
    await fs.rm(fx.getMigrationsDir(), { recursive: true, force: true });
    const result = await fx.cli(["migrate:make", "Bootstrap"]);
    expect(result.exitCode).toBe(0);
    const entries = await fs.readdir(fx.getMigrationsDir());
    expect(entries).toHaveLength(1);
  });
});
