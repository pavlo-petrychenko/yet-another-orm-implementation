import type { LoadedConfig } from "@/cli/loadConfig";
import type { Driver } from "@/drivers/common/Driver";
import { DriverFactory } from "@/drivers/DriverFactory";
import { MigrationRunner } from "@/migrations/MigrationRunner";

export interface MadeRunner {
  runner: MigrationRunner;
  driver: Driver;
  shutdown: () => Promise<void>;
}

export async function makeRunner(loaded: LoadedConfig): Promise<MadeRunner> {
  const driver = new DriverFactory().create(loaded.config.driver);
  await driver.connect();

  const runner = new MigrationRunner({
    driver,
    migrationsDir: loaded.config.migrationsDir,
    tableName: loaded.config.tableName,
    fileExtensions: loaded.config.fileExtensions,
  });

  return {
    runner,
    driver,
    shutdown: async (): Promise<void> => {
      if (driver.isConnected()) await driver.disconnect();
    },
  };
}
