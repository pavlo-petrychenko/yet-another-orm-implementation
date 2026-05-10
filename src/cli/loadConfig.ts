import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { YaoiConfig } from "@/cli/defineConfig";
import { ConfigNotFoundError, ConfigShapeError } from "@/cli/errors";

export interface LoadedConfig {
  config: YaoiConfig;
  configPath: string;
  configDir: string;
}

const SEARCH_NAMES = [
  "yaoi.config.ts",
  "yaoi.config.js",
  "yaoi.config.cjs",
  "yaoi.config.mjs",
] as const;

interface TsNodeModule {
  register: (opts: { transpileOnly: boolean }) => unknown;
}

let isTsNodeRegistered = false;

function registerTsNode(): void {
  if (isTsNodeRegistered) return;

  const localRequire = createRequire(__filename);
  const tsNode = localRequire("ts-node") as TsNodeModule;
  tsNode.register({ transpileOnly: true });
  localRequire("tsconfig-paths/register");
  isTsNodeRegistered = true;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function resolveConfigPath(opts: { cwd: string; explicitPath?: string }): Promise<string> {
  if (opts.explicitPath !== undefined) {
    const resolved = path.isAbsolute(opts.explicitPath)
      ? opts.explicitPath
      : path.resolve(opts.cwd, opts.explicitPath);
    if (!(await fileExists(resolved))) {
      throw new ConfigNotFoundError(opts.cwd, [resolved]);
    }
    return resolved;
  }

  const tried: string[] = [];
  for (const name of SEARCH_NAMES) {
    const candidate = path.join(opts.cwd, name);
    tried.push(candidate);
    if (await fileExists(candidate)) return candidate;
  }
  throw new ConfigNotFoundError(opts.cwd, tried);
}

function validateConfigShape(value: unknown, configPath: string): YaoiConfig {
  if (typeof value !== "object" || value === null) {
    throw new ConfigShapeError(configPath, "default export is not an object");
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.migrationsDir !== "string" || obj.migrationsDir.length === 0) {
    throw new ConfigShapeError(configPath, "missing or invalid `migrationsDir`");
  }
  if (typeof obj.driver !== "object" || obj.driver === null) {
    throw new ConfigShapeError(configPath, "missing or invalid `driver`");
  }
  const driver = obj.driver as Record<string, unknown>;
  if (typeof driver.type !== "string") {
    throw new ConfigShapeError(configPath, "`driver.type` must be a string");
  }
  return obj as unknown as YaoiConfig;
}

export async function loadConfig(opts?: {
  cwd?: string;
  explicitPath?: string;
}): Promise<LoadedConfig> {
  const cwd = opts?.cwd ?? process.cwd();
  const configPath = await resolveConfigPath({ cwd, explicitPath: opts?.explicitPath });

  if (configPath.endsWith(".ts")) {
    registerTsNode();
  }

  const mod: unknown = await import(configPath);
  const candidate = (mod as { default?: unknown }).default ?? mod;
  const config = validateConfigShape(candidate, configPath);

  const configDir = path.dirname(configPath);
  const resolvedMigrationsDir = path.isAbsolute(config.migrationsDir)
    ? config.migrationsDir
    : path.resolve(configDir, config.migrationsDir);

  return {
    config: { ...config, migrationsDir: resolvedMigrationsDir },
    configPath,
    configDir,
  };
}
