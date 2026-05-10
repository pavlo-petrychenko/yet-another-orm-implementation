import { renderStatusTable } from "@/cli/output";
import type { MigrationStatus } from "@/migrations/types";

const APPLIED_AT = new Date(Date.UTC(2026, 4, 8, 17, 11, 42));

describe("renderStatusTable", () => {
  it("renders a header + separator + each row", () => {
    const rows: MigrationStatus[] = [
      {
        name: "001_init",
        applied: true,
        appliedAt: APPLIED_AT,
        storedChecksum: "a".repeat(64),
        fileChecksum: "a".repeat(64),
        mismatch: false,
      },
      {
        name: "002_add_posts",
        applied: false,
        appliedAt: null,
        storedChecksum: null,
        fileChecksum: "b".repeat(64),
        mismatch: false,
      },
    ];
    const output = renderStatusTable(rows);
    const lines = output.split("\n");
    expect(lines[0]).toMatch(/^STATE\s+NAME\s+APPLIED AT\s+MISMATCH$/);
    expect(lines[1]).toMatch(/^-+\s+-+\s+-+\s+-+$/);
    expect(lines[2]).toContain("applied");
    expect(lines[2]).toContain("001_init");
    expect(lines[2]).toContain("2026-05-08T17:11:42Z");
    expect(lines[2]).toContain("no");
    expect(lines[3]).toContain("pending");
    expect(lines[3]).toContain("002_add_posts");
    expect(lines[3]).toContain("—");
  });

  it("renders orphan state when applied but no fileChecksum", () => {
    const rows: MigrationStatus[] = [
      {
        name: "003_dropped",
        applied: true,
        appliedAt: APPLIED_AT,
        storedChecksum: "x".repeat(64),
        fileChecksum: null,
        mismatch: false,
      },
    ];
    const output = renderStatusTable(rows);
    expect(output).toContain("orphan");
    expect(output).toContain("003_dropped");
  });

  it("renders MISMATCH=YES when checksums differ", () => {
    const rows: MigrationStatus[] = [
      {
        name: "004_seed_tags",
        applied: true,
        appliedAt: APPLIED_AT,
        storedChecksum: "a".repeat(64),
        fileChecksum: "b".repeat(64),
        mismatch: true,
      },
    ];
    const output = renderStatusTable(rows);
    expect(output).toContain("YES");
  });

  it("never truncates long migration names", () => {
    const longName = "a_very_long_migration_name_that_exceeds_normal_widths_for_real";
    const rows: MigrationStatus[] = [
      {
        name: longName,
        applied: false,
        appliedAt: null,
        storedChecksum: null,
        fileChecksum: "z".repeat(64),
        mismatch: false,
      },
    ];
    const output = renderStatusTable(rows);
    expect(output).toContain(longName);
  });

  it("renders only the header row when no migrations exist", () => {
    const output = renderStatusTable([]);
    const lines = output.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("STATE");
  });
});
