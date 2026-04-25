import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";
import type { EntityTarget } from "@/metadata/types/EntityMetadata";

export type ColumnType =
  | "string"
  | "text"
  | "integer"
  | "bigint"
  | "float"
  | "decimal"
  | "boolean"
  | "date"
  | "timestamp"
  | "timestamptz"
  | "json"
  | "jsonb"
  | "uuid";

export type DefaultValue =
  | { kind: "literal"; value: ScalarParam }
  | { kind: "raw"; sql: string };

export type GeneratedStrategy = "increment" | "identity" | "uuid";

export interface ColumnOptions {
  name?: string;
  type?: ColumnType;
  dbType?: string;
  nullable?: boolean;
  unique?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  default?: DefaultValue | ScalarParam;
  primary?: boolean;
  generated?: GeneratedStrategy;
  comment?: string;
}

export interface ColumnMetadata {
  target: EntityTarget;
  propertyName: string;
  columnName: string;
  type: ColumnType;
  dbType?: string;
  nullable: boolean;
  isPrimary: boolean;
  isUnique: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  default?: DefaultValue;
  generated?: GeneratedStrategy;
  comment?: string;
}
