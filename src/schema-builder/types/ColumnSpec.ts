import type { ColumnType } from "@/schema-builder/types/ColumnType";
import type { ReferentialAction } from "@/schema-builder/types/ReferentialAction";

export interface ColumnReference {
  table: string;
  column: string;
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
}

export type DefaultValue =
  | { kind: "value"; value: unknown }
  | { kind: "raw"; sql: string };

export interface ColumnSpec {
  name: string;
  columnType: ColumnType;
  notNull: boolean;
  primary: boolean;
  unique: boolean;
  default?: DefaultValue;
  references?: ColumnReference;
}
