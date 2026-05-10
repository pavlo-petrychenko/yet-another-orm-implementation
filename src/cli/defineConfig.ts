import type { DriverConfig } from "@/drivers/types/DriverConfig";

export interface YaoiConfig {
  driver: DriverConfig;
  migrationsDir: string;
  tableName?: string;
  fileExtensions?: readonly string[];
}

export function defineConfig(config: YaoiConfig): YaoiConfig {
  return config;
}
