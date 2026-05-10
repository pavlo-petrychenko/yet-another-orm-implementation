import type { ColumnType } from "@/schema-builder/types/ColumnType";

export class PostgresColumnTypeCompiler {
  compile(t: ColumnType): string {
    switch (t.kind) {
      case "varchar":
        return t.length != null ? `VARCHAR(${String(t.length)})` : "VARCHAR";
      case "text":
        return "TEXT";
      case "integer":
        return "INTEGER";
      case "bigint":
        return "BIGINT";
      case "smallint":
        return "SMALLINT";
      case "boolean":
        return "BOOLEAN";
      case "decimal":
        if (t.precision != null) {
          return t.scale != null
            ? `DECIMAL(${String(t.precision)},${String(t.scale)})`
            : `DECIMAL(${String(t.precision)})`;
        }
        return "DECIMAL";
      case "timestamp":
        return t.withTimezone ? "TIMESTAMPTZ" : "TIMESTAMP";
      case "date":
        return "DATE";
      case "time":
        return "TIME";
      case "json":
        return "JSON";
      case "jsonb":
        return "JSONB";
      case "uuid":
        return "UUID";
      case "serial":
        return "SERIAL";
      case "bigserial":
        return "BIGSERIAL";
      case "raw":
        return t.sql;
    }
  }
}
