import {
  ChecksumMismatchError,
  InvalidMigrationFileError,
  MigrationNotFoundError,
  MissingMigrationFileError,
  OutOfOrderRollbackError,
} from "@/migrations/errors";

describe("migration errors", () => {
  it("ChecksumMismatchError exposes name + stored + current and a clear message", () => {
    const stored = "a".repeat(64);
    const current = "b".repeat(64);
    const err = new ChecksumMismatchError("001_init", stored, current);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ChecksumMismatchError");
    expect(err.migrationName).toBe("001_init");
    expect(err.stored).toBe(stored);
    expect(err.current).toBe(current);
    expect(err.message).toContain("001_init");
    expect(err.message).toContain("aaaaaaaaaaaa");
    expect(err.message).toContain("bbbbbbbbbbbb");
  });

  it("MissingMigrationFileError mentions the migration name", () => {
    const err = new MissingMigrationFileError("003_users");
    expect(err.name).toBe("MissingMigrationFileError");
    expect(err.message).toContain("003_users");
  });

  it("InvalidMigrationFileError captures the path and reason", () => {
    const err = new InvalidMigrationFileError("/tmp/bad.ts", "missing exports");
    expect(err.name).toBe("InvalidMigrationFileError");
    expect(err.path).toBe("/tmp/bad.ts");
    expect(err.message).toContain("/tmp/bad.ts");
    expect(err.message).toContain("missing exports");
  });

  it("OutOfOrderRollbackError describes both names", () => {
    const err = new OutOfOrderRollbackError("001_init", "003_x");
    expect(err.name).toBe("OutOfOrderRollbackError");
    expect(err.message).toContain("001_init");
    expect(err.message).toContain("003_x");
  });

  it("MigrationNotFoundError carries the missing name", () => {
    const err = new MigrationNotFoundError("999_missing");
    expect(err.name).toBe("MigrationNotFoundError");
    expect(err.migrationName).toBe("999_missing");
    expect(err.message).toContain("999_missing");
  });
});
