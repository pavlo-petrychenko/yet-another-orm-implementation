export type ColumnType =
  | { kind: "varchar"; length?: number }
  | { kind: "text" }
  | { kind: "integer" }
  | { kind: "bigint" }
  | { kind: "smallint" }
  | { kind: "boolean" }
  | { kind: "decimal"; precision?: number; scale?: number }
  | { kind: "timestamp"; withTimezone?: boolean }
  | { kind: "date" }
  | { kind: "time" }
  | { kind: "json" }
  | { kind: "jsonb" }
  | { kind: "uuid" }
  | { kind: "serial" }
  | { kind: "bigserial" }
  | { kind: "raw"; sql: string };
