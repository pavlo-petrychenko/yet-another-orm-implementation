import type { Driver } from "@/drivers/common/Driver";

const LOCK_KEY = 0x59414f49;

export async function acquireRunnerLock(driver: Driver): Promise<void> {
  await driver.raw("SELECT pg_advisory_xact_lock($1)", [LOCK_KEY]);
}
