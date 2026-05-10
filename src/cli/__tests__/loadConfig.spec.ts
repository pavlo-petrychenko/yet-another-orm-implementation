import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ConfigNotFoundError, ConfigShapeError } from "@/cli/errors";
import { loadConfig } from "@/cli/loadConfig";

describe("loadConfig", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yaoi-cfg-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("throws ConfigNotFoundError when no config file exists", async () => {
    await expect(loadConfig({ cwd: tmpDir })).rejects.toBeInstanceOf(ConfigNotFoundError);
  });

  it("loads a yaoi.config.js with default export", async () => {
    const cfg = `
module.exports = {
  driver: { type: "postgres", host: "h", port: 5432, user: "u", password: "p", database: "d" },
  migrationsDir: "./migrations",
};
`;
    await fs.writeFile(path.join(tmpDir, "yaoi.config.js"), cfg);
    const loaded = await loadConfig({ cwd: tmpDir });
    expect(loaded.config.driver.type).toBe("postgres");
    expect(loaded.config.migrationsDir).toBe(path.resolve(tmpDir, "migrations"));
    expect(loaded.configPath).toBe(path.join(tmpDir, "yaoi.config.js"));
  });

  it("throws ConfigShapeError when migrationsDir is missing", async () => {
    const cfg = `module.exports = { driver: { type: "postgres" } };`;
    await fs.writeFile(path.join(tmpDir, "yaoi.config.js"), cfg);
    await expect(loadConfig({ cwd: tmpDir })).rejects.toBeInstanceOf(ConfigShapeError);
  });

  it("throws ConfigShapeError when driver is missing", async () => {
    const cfg = `module.exports = { migrationsDir: "./migrations" };`;
    await fs.writeFile(path.join(tmpDir, "yaoi.config.js"), cfg);
    await expect(loadConfig({ cwd: tmpDir })).rejects.toBeInstanceOf(ConfigShapeError);
  });

  it("throws ConfigShapeError when default export is not an object", async () => {
    const cfg = `module.exports = "not-an-object";`;
    await fs.writeFile(path.join(tmpDir, "yaoi.config.js"), cfg);
    await expect(loadConfig({ cwd: tmpDir })).rejects.toBeInstanceOf(ConfigShapeError);
  });

  it("respects an explicit --config path", async () => {
    const cfg = `
module.exports = {
  driver: { type: "postgres", host: "h", port: 5432, user: "u", password: "p", database: "d" },
  migrationsDir: "./migrations",
};
`;
    const customPath = path.join(tmpDir, "custom-yaoi.cjs");
    await fs.writeFile(customPath, cfg);
    const loaded = await loadConfig({ cwd: tmpDir, explicitPath: customPath });
    expect(loaded.configPath).toBe(customPath);
  });

  it("throws ConfigNotFoundError for an explicit path that does not exist", async () => {
    await expect(
      loadConfig({ cwd: tmpDir, explicitPath: path.join(tmpDir, "nope.cjs") }),
    ).rejects.toBeInstanceOf(ConfigNotFoundError);
  });

  it("preserves an absolute migrationsDir", async () => {
    const absDir = path.join(tmpDir, "abs-migrations");
    const cfg = `
module.exports = {
  driver: { type: "postgres", host: "h", port: 5432, user: "u", password: "p", database: "d" },
  migrationsDir: ${JSON.stringify(absDir)},
};
`;
    await fs.writeFile(path.join(tmpDir, "yaoi.config.js"), cfg);
    const loaded = await loadConfig({ cwd: tmpDir });
    expect(loaded.config.migrationsDir).toBe(absDir);
  });
});
