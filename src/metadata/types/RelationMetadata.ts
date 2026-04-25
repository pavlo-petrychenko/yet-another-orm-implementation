import type { EntityTarget } from "@/metadata/types/EntityMetadata";

export type RelationKind = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";

export type RelationTargetResolver = () => EntityTarget;

export interface JoinColumnOptions {
  name?: string;
  referencedColumnName?: string;
}

export interface JoinTableOptions {
  name?: string;
  joinColumn?: JoinColumnOptions;
  inverseJoinColumn?: JoinColumnOptions;
}

export interface RelationOptions {
  kind: RelationKind;
  target: RelationTargetResolver;
  inverseSide?: string;
  joinColumn?: JoinColumnOptions;
  joinTable?: JoinTableOptions;
  cascade?: boolean;
  nullable?: boolean;
}

export interface ResolvedJoinColumn {
  columnName: string;
  referencedColumnName: string;
}

export interface ResolvedJoinTable {
  tableName: string;
  joinColumnName: string;
  inverseJoinColumnName: string;
}

export interface RelationMetadata {
  target: EntityTarget;
  propertyName: string;
  kind: RelationKind;
  resolveTarget: RelationTargetResolver;
  inverseSide?: string;
  joinColumn?: ResolvedJoinColumn;
  joinTable?: ResolvedJoinTable;
  cascade: boolean;
  nullable: boolean;
}
