import type { Driver } from "@/drivers/common/Driver";
import { SchemaBuilder } from "@/schema-builder/SchemaBuilder";

import type { AppliedRow } from "@/migrations/types";

export const DEFAULT_TABLE_NAME = "yaoi_migrations";

export async function ensureTrackingTable(
  driver: Driver,
  tableName: string,
): Promise<void> {
  const schema = new SchemaBuilder(driver);
  await schema.createTable(tableName, (t) => {
    t.ifNotExists();
    t.id();
    t.text("name").notNull().unique();
    t.text("checksum").notNull();
    t.timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultRaw("NOW()");
  });
}

export async function readApplied(
  driver: Driver,
  tableName: string,
): Promise<AppliedRow[]> {
  const result = await driver.raw<AppliedRow>(
    `SELECT id, name, checksum, applied_at FROM "${tableName}" ORDER BY name ASC`,
  );
  return result.rows;
}

export async function recordApplied(
  driver: Driver,
  tableName: string,
  name: string,
  checksum: string,
): Promise<void> {
  await driver.raw(
    `INSERT INTO "${tableName}" (name, checksum) VALUES ($1, $2)`,
    [name, checksum],
  );
}

export async function deleteApplied(
  driver: Driver,
  tableName: string,
  name: string,
): Promise<void> {
  await driver.raw(`DELETE FROM "${tableName}" WHERE name = $1`, [name]);
}
