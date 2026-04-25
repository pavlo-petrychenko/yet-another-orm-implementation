import type { ColumnOptions } from "@/metadata/types/ColumnMetadata";
import type { EntityMetadata, EntityOptions, EntityTarget } from "@/metadata/types/EntityMetadata";
import type { RelationOptions } from "@/metadata/types/RelationMetadata";

export interface MetadataStorage {
  registerEntity(target: EntityTarget, options?: EntityOptions): void;
  registerColumn(target: EntityTarget, propertyName: string, options?: ColumnOptions): void;
  registerRelation(target: EntityTarget, propertyName: string, options: RelationOptions): void;

  getEntity(target: EntityTarget): EntityMetadata | undefined;
  hasEntity(target: EntityTarget): boolean;
  getEntities(): readonly EntityMetadata[];

  clear(): void;
}
