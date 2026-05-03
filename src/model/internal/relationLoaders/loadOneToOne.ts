import type { EntityMetadata, RelationMetadata } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { groupByKey } from "@/model/internal/relationUtils";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

import { loadManyToOne } from "./loadManyToOne";
import { fetchChildrenByInverseFk } from "./loadOneToMany";
import type { Row } from "./shared";

export async function loadOneToOne(
  dataSource: DataSource,
  parents: readonly Row[],
  parentMeta: EntityMetadata,
  relation: RelationMetadata,
  nestedInclude: IncludeConfig<unknown> | undefined,
  depth: number,
): Promise<void> {
  if (relation.joinColumn) {
    return loadManyToOne(dataSource, parents, parentMeta, relation, nestedInclude, depth);
  }

  const fetched = await fetchChildrenByInverseFk(
    dataSource,
    parents,
    parentMeta,
    relation,
    nestedInclude,
    depth,
  );
  if (!fetched) return;

  const grouped = groupByKey(fetched.children, (c) => c[fetched.inverseFkProperty]);
  for (const parent of parents) {
    const list = grouped.get(parent[fetched.parentPkProperty]);
    parent[relation.propertyName] = list && list.length > 0 ? list[0] : undefined;
  }
}
