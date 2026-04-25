import type { ColumnDescription, TableDescription } from "@/query-builder";

export interface DialectUtils {
  escapeIdentifier(name: string): string;
  qualifyTable(table: TableDescription): string;
  qualifyColumn(column: ColumnDescription): string;
}
