import { acquireRunnerLock } from "@/migrations/advisoryLock";
import { fileChecksum } from "@/migrations/checksum";
import {
  ChecksumMismatchError,
  MigrationNotFoundError,
  MissingMigrationFileError,
  OutOfOrderRollbackError,
} from "@/migrations/errors";
import { DEFAULT_FILE_EXTENSIONS, discoverMigrations } from "@/migrations/loader";
import type { DiscoveredMigration } from "@/migrations/loader";
import {
  DEFAULT_TABLE_NAME,
  deleteApplied,
  ensureTrackingTable,
  readApplied,
  recordApplied,
} from "@/migrations/trackingTable";
import type {
  AppliedRow,
  MigrationRunnerOptions,
  MigrationStatus,
} from "@/migrations/types";
import { SchemaBuilder } from "@/schema-builder/SchemaBuilder";

export interface UpResult {
  applied: string[];
}

export interface DownResult {
  rolledBack: string | null;
}

export class MigrationRunner {
  private readonly tableName: string;
  private readonly fileExtensions: readonly string[];

  constructor(private readonly opts: MigrationRunnerOptions) {
    this.tableName = opts.tableName ?? DEFAULT_TABLE_NAME;
    this.fileExtensions = opts.fileExtensions ?? DEFAULT_FILE_EXTENSIONS;
  }

  async up(opts?: { to?: string }): Promise<UpResult> {
    const driver = this.opts.driver;
    await this.bootstrap();

    const files = await this.discoverFiles();
    const applied = await readApplied(driver, this.tableName);

    await this.verifyAppliedChecksums(applied, files);

    const filesByName = new Map(files.map((f) => [f.name, f]));
    const appliedNames = new Set(applied.map((r) => r.name));

    let pending = files.filter((f) => !appliedNames.has(f.name));
    if (opts?.to !== undefined) {
      const target = opts.to;
      if (!filesByName.has(target)) throw new MigrationNotFoundError(target);
      const idx = pending.findIndex((f) => f.name === target);
      if (idx === -1) {
        return { applied: [] };
      }
      pending = pending.slice(0, idx + 1);
    }

    const newlyApplied: string[] = [];
    for (const file of pending) {
      const checksum = await fileChecksum(file.absolutePath);
      const migration = await file.load();
      const didApplyThis = await driver.withTransaction(async (tx) => {
        await acquireRunnerLock(tx);
        const insideRows = await readApplied(tx, this.tableName);
        if (insideRows.some((r) => r.name === file.name)) return false;
        await migration.up(new SchemaBuilder(tx));
        await recordApplied(tx, this.tableName, file.name, checksum);
        return true;
      });
      if (didApplyThis) newlyApplied.push(file.name);
    }

    return { applied: newlyApplied };
  }

  async down(opts?: { name?: string }): Promise<DownResult> {
    const driver = this.opts.driver;
    await this.bootstrap();

    const applied = await readApplied(driver, this.tableName);
    if (applied.length === 0) return { rolledBack: null };

    const mostRecent = pickMostRecent(applied);
    if (opts?.name !== undefined && opts.name !== mostRecent.name) {
      throw new OutOfOrderRollbackError(opts.name, mostRecent.name);
    }

    const files = await this.discoverFiles();
    const file = files.find((f) => f.name === mostRecent.name);
    if (!file) throw new MissingMigrationFileError(mostRecent.name);

    const currentChecksum = await fileChecksum(file.absolutePath);
    if (currentChecksum !== mostRecent.checksum) {
      throw new ChecksumMismatchError(
        mostRecent.name,
        mostRecent.checksum,
        currentChecksum,
      );
    }

    const migration = await file.load();
    await driver.withTransaction(async (tx) => {
      await acquireRunnerLock(tx);
      await migration.down(new SchemaBuilder(tx));
      await deleteApplied(tx, this.tableName, mostRecent.name);
    });

    return { rolledBack: mostRecent.name };
  }

  async status(): Promise<MigrationStatus[]> {
    const driver = this.opts.driver;
    await this.bootstrap();

    const files = await this.discoverFiles();
    const applied = await readApplied(driver, this.tableName);

    const fileByName = new Map(files.map((f) => [f.name, f]));
    const appliedByName = new Map(applied.map((r) => [r.name, r]));
    const allNames = new Set<string>([
      ...fileByName.keys(),
      ...appliedByName.keys(),
    ]);

    const result: MigrationStatus[] = [];
    for (const name of [...allNames].sort()) {
      const row = appliedByName.get(name);
      const file = fileByName.get(name);
      const fileSum = file ? await fileChecksum(file.absolutePath) : null;
      result.push({
        name,
        applied: row !== undefined,
        appliedAt: row?.applied_at ?? null,
        storedChecksum: row?.checksum ?? null,
        fileChecksum: fileSum,
        mismatch:
          row !== undefined && fileSum !== null && row.checksum !== fileSum,
      });
    }
    return result;
  }

  private async bootstrap(): Promise<void> {
    await this.opts.driver.withTransaction(async (tx) => {
      await acquireRunnerLock(tx);
      await ensureTrackingTable(tx, this.tableName);
    });
  }

  private async discoverFiles(): Promise<DiscoveredMigration[]> {
    return discoverMigrations(this.opts.migrationsDir, this.fileExtensions);
  }

  private async verifyAppliedChecksums(
    applied: readonly AppliedRow[],
    files: readonly DiscoveredMigration[],
  ): Promise<void> {
    const fileByName = new Map(files.map((f) => [f.name, f]));
    for (const row of applied) {
      const file = fileByName.get(row.name);
      if (!file) throw new MissingMigrationFileError(row.name);
      const current = await fileChecksum(file.absolutePath);
      if (current !== row.checksum) {
        throw new ChecksumMismatchError(row.name, row.checksum, current);
      }
    }
  }
}

function pickMostRecent(applied: readonly AppliedRow[]): AppliedRow {
  let best = applied[0];
  for (const row of applied) {
    if (
      row.applied_at.getTime() > best.applied_at.getTime()
      || (row.applied_at.getTime() === best.applied_at.getTime() && row.id > best.id)
    ) {
      best = row;
    }
  }
  return best;
}
