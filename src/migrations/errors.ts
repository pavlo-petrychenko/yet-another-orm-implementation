export class ChecksumMismatchError extends Error {
  public readonly name = "ChecksumMismatchError";

  constructor(
    public readonly migrationName: string,
    public readonly stored: string,
    public readonly current: string,
  ) {
    super(
      `Migration "${migrationName}" has been modified since it was applied `
        + `(stored=${stored.slice(0, 12)}..., current=${current.slice(0, 12)}...). `
        + `Resolve by reverting the file or rolling the migration back first.`,
    );
  }
}

export class MissingMigrationFileError extends Error {
  public readonly name = "MissingMigrationFileError";

  constructor(public readonly migrationName: string) {
    super(
      `Migration "${migrationName}" is recorded as applied but its source file `
        + `is missing from the migrations directory.`,
    );
  }
}

export class InvalidMigrationFileError extends Error {
  public readonly name = "InvalidMigrationFileError";

  constructor(public readonly path: string, reason: string) {
    super(`Migration file "${path}" is invalid: ${reason}`);
  }
}

export class OutOfOrderRollbackError extends Error {
  public readonly name = "OutOfOrderRollbackError";

  constructor(public readonly requested: string, public readonly mostRecent: string) {
    super(
      `Cannot roll back "${requested}" — it is not the most recently applied migration. `
        + `Most recent is "${mostRecent}". Roll back the most recent migration first.`,
    );
  }
}

export class MigrationNotFoundError extends Error {
  public readonly name = "MigrationNotFoundError";

  constructor(public readonly migrationName: string) {
    super(`Migration "${migrationName}" was not found in the migrations directory.`);
  }
}
