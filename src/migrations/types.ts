import type { Driver } from "@/drivers/common/Driver";
import type { SchemaBuilder } from "@/schema-builder/SchemaBuilder";

export interface Migration {
  up(schema: SchemaBuilder): Promise<void>;
  down(schema: SchemaBuilder): Promise<void>;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  appliedAt: Date | null;
  storedChecksum: string | null;
  fileChecksum: string | null;
  mismatch: boolean;
}

export interface MigrationRunnerOptions {
  driver: Driver;
  migrationsDir: string;
  tableName?: string;
  fileExtensions?: readonly string[];
}

export interface AppliedRow {
  id: number;
  name: string;
  checksum: string;
  applied_at: Date;
}
