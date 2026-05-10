import type { MigrationStatus } from "@/migrations/types";

export function info(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function warn(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function error(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function print(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

type StatusState = "applied" | "pending" | "orphan";

function stateOf(row: MigrationStatus): StatusState {
  if (row.applied && row.fileChecksum === null) return "orphan";
  if (row.applied) return "applied";
  return "pending";
}

function formatAppliedAt(row: MigrationStatus): string {
  if (row.appliedAt === null) return "—";
  return row.appliedAt.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function formatMismatch(row: MigrationStatus): string {
  if (!row.applied) return "—";
  if (row.fileChecksum === null) return "—";
  return row.mismatch ? "YES" : "no";
}

export function renderStatusTable(rows: readonly MigrationStatus[]): string {
  const headers = ["STATE", "NAME", "APPLIED AT", "MISMATCH"];
  const data = rows.map((r) => [
    stateOf(r),
    r.name,
    formatAppliedAt(r),
    formatMismatch(r),
  ]);

  const widths = headers.map((h, c) => {
    let w = h.length;
    for (const row of data) {
      if (row[c].length > w) w = row[c].length;
    }
    return w;
  });

  const renderRow = (row: readonly string[]): string =>
    row.map((cell, c) => cell.padEnd(widths[c])).join("  ").trimEnd();

  const separator = widths.map((w) => "-".repeat(w)).join("  ");

  const lines = [renderRow(headers), separator, ...data.map(renderRow)];
  return lines.join("\n");
}
