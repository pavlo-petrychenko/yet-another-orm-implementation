import type { ColumnMetadata } from "@/metadata/types/ColumnMetadata";
import type { RelationMetadata } from "@/metadata/types/RelationMetadata";

export type EntityTarget<T = unknown> = abstract new (...args: any[]) => T;

export interface EntityOptions {
  name?: string;
  schema?: string;
}

export interface EntityMetadata {
  target: EntityTarget;
  className: string;
  tableName: string;
  schema?: string;

  columns: readonly ColumnMetadata[];
  primaryColumns: readonly ColumnMetadata[];
  relations: readonly RelationMetadata[];

  columnsByPropertyName: ReadonlyMap<string, ColumnMetadata>;
  relationsByPropertyName: ReadonlyMap<string, RelationMetadata>;
}
