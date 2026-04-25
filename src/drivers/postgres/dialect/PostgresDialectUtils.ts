import type { ColumnDescription, TableDescription } from "@/query-builder";
import type { DialectUtils } from "@/drivers/common/DialectUtils";

export class PostgresDialectUtils implements DialectUtils {
  escapeIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  qualifyTable(table: TableDescription): string {
    const base = this.escapeIdentifier(table.name);
    return table.alias ? `${base} AS ${this.escapeIdentifier(table.alias)}` : base;
  }

  qualifyColumn(column: ColumnDescription): string {
    const name = this.escapeIdentifier(column.name);
    return column.table ? `${this.escapeIdentifier(column.table)}.${name}` : name;
  }
}
