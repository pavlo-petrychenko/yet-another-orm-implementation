import type { EntityMetadata, EntityTarget, RelationMetadata } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { loadIncludes } from "@/model/internal/loadIncludes";
import {
  collectKeys,
  findColumnByName,
  groupByKey,
  resolveInverseRelation,
  singlePrimaryColumn,
} from "@/model/internal/relationUtils";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

import { fetchByColumnIn, type Row } from "./shared";

interface FetchedChildren {
  children: Row[];
  inverseFkProperty: string;
  parentPkProperty: string;
}

async function fetchChildrenByInverseFk(
  dataSource: DataSource,
  parents: readonly Row[],
  parentMeta: EntityMetadata,
  relation: RelationMetadata,
  nestedInclude: IncludeConfig<unknown> | undefined,
  depth: number,
): Promise<FetchedChildren | null> {
  const target = relation.resolveTarget();
  const targetMeta = dataSource.getMetadata(target);
  const inverseRelation = resolveInverseRelation(relation, targetMeta);
  const fk = inverseRelation.joinColumn;
  if (!fk) {
    throw new ModelError(
      "INVERSE_SIDE_NOT_FOUND",
      `Inverse relation ${targetMeta.className}.${inverseRelation.propertyName} is missing a join column`,
    );
  }

  const parentPk = singlePrimaryColumn(parentMeta);
  const inverseFkColumn = findColumnByName(targetMeta, fk.columnName);

  const parentIds = collectKeys(parents, (p) => p[parentPk.propertyName]);
  if (parentIds.length === 0) {
    return {
      children: [],
      inverseFkProperty: inverseFkColumn.propertyName,
      parentPkProperty: parentPk.propertyName,
    };
  }

  const children = await fetchByColumnIn(
    dataSource,
    target as EntityTarget<object>,
    targetMeta,
    fk.columnName,
    parentIds,
  );

  if (nestedInclude) {
    await loadIncludes(dataSource, children, targetMeta, nestedInclude, depth + 1);
  }

  return {
    children: children as Row[],
    inverseFkProperty: inverseFkColumn.propertyName,
    parentPkProperty: parentPk.propertyName,
  };
}

export async function loadOneToMany(
  dataSource: DataSource,
  parents: readonly Row[],
  parentMeta: EntityMetadata,
  relation: RelationMetadata,
  nestedInclude: IncludeConfig<unknown> | undefined,
  depth: number,
): Promise<void> {
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
    parent[relation.propertyName] = grouped.get(parent[fetched.parentPkProperty]) ?? [];
  }
}

export { fetchChildrenByInverseFk };
