import type { RelationKind } from "@/metadata/types";

import { loadManyToMany } from "./loadManyToMany";
import { loadManyToOne } from "./loadManyToOne";
import { loadOneToMany } from "./loadOneToMany";
import { loadOneToOne } from "./loadOneToOne";
import type { Row } from "./shared";

import type { EntityMetadata, RelationMetadata } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

export type RelationLoader = (
  dataSource: DataSource,
  parents: readonly Row[],
  parentMeta: EntityMetadata,
  relation: RelationMetadata,
  nestedInclude: IncludeConfig<unknown> | undefined,
  depth: number,
) => Promise<void>;

export const relationLoaders: Record<RelationKind, RelationLoader> = {
  "many-to-one": loadManyToOne,
  "one-to-many": loadOneToMany,
  "one-to-one": loadOneToOne,
  "many-to-many": loadManyToMany,
};

export type { Row };
