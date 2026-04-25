export type {
  EntityTarget,
  EntityOptions,
  EntityMetadata,
  ColumnType,
  DefaultValue,
  GeneratedStrategy,
  ColumnOptions,
  ColumnMetadata,
  RelationKind,
  RelationTargetResolver,
  JoinColumnOptions,
  JoinTableOptions,
  RelationOptions,
  ResolvedJoinColumn,
  ResolvedJoinTable,
  RelationMetadata,
  MetadataStorage,
} from "@/metadata/types";

export { DefaultMetadataStorage, defaultMetadataStorage } from "@/metadata/storage";
export { MetadataError } from "@/metadata/errors";
export type { MetadataErrorCode } from "@/metadata/errors";
