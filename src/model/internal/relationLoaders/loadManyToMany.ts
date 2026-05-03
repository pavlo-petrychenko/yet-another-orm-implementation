import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";
import { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
import type { EntityMetadata, EntityTarget, RelationMetadata } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { loadIncludes } from "@/model/internal/loadIncludes";
import {
  collectKeys,
  resolveInverseRelation,
  singlePrimaryColumn,
} from "@/model/internal/relationUtils";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

import { fetchByColumnIn, type Row } from "./shared";

interface JoinTableSides {
  joinTableName: string;
  parentSideFk: string;
  targetSideFk: string;
}

function resolveJoinTableSides(
  relation: RelationMetadata,
  targetMeta: EntityMetadata,
): JoinTableSides {
  if (relation.joinTable) {
    return {
      joinTableName: relation.joinTable.tableName,
      parentSideFk: relation.joinTable.joinColumnName,
      targetSideFk: relation.joinTable.inverseJoinColumnName,
    };
  }
  const inverseRelation = resolveInverseRelation(relation, targetMeta);
  const inverseJoinTable = inverseRelation.joinTable;
  if (!inverseJoinTable) {
    throw new ModelError(
      "INVERSE_SIDE_NOT_FOUND",
      `Inverse many-to-many relation ${targetMeta.className}.${inverseRelation.propertyName} has no join table`,
    );
  }
  return {
    joinTableName: inverseJoinTable.tableName,
    parentSideFk: inverseJoinTable.inverseJoinColumnName,
    targetSideFk: inverseJoinTable.joinColumnName,
  };
}

export async function loadManyToMany(
  dataSource: DataSource,
  parents: readonly Row[],
  parentMeta: EntityMetadata,
  relation: RelationMetadata,
  nestedInclude: IncludeConfig<unknown> | undefined,
  depth: number,
): Promise<void> {
  const target = relation.resolveTarget();
  const targetMeta = dataSource.getMetadata(target);
  const parentPk = singlePrimaryColumn(parentMeta);
  const targetPk = singlePrimaryColumn(targetMeta);
  const sides = resolveJoinTableSides(relation, targetMeta);

  const parentIds = collectKeys(parents, (p) => p[parentPk.propertyName]);
  if (parentIds.length === 0) {
    for (const parent of parents) parent[relation.propertyName] = [];
    return;
  }

  const joinQb = new QueryBuilder().select({ name: sides.joinTableName });
  joinQb.select(
    { name: sides.parentSideFk, table: sides.joinTableName },
    { name: sides.targetSideFk, table: sides.joinTableName },
  );
  joinQb.where((b) => {
    b.whereIn(
      { name: sides.parentSideFk, table: sides.joinTableName },
      parentIds as ScalarParam[],
    );
  });

  const joinResult = await dataSource.getDriver().query(joinQb.build());
  const joinRows = joinResult.rows as Row[];

  if (joinRows.length === 0) {
    for (const parent of parents) parent[relation.propertyName] = [];
    return;
  }

  const targetIdSet = new Set<unknown>();
  for (const row of joinRows) {
    const tid = row[sides.targetSideFk];
    if (tid !== undefined && tid !== null) targetIdSet.add(tid);
  }
  const targetIds = [...targetIdSet];
  if (targetIds.length === 0) {
    for (const parent of parents) parent[relation.propertyName] = [];
    return;
  }

  const children = await fetchByColumnIn(
    dataSource,
    target as EntityTarget<object>,
    targetMeta,
    targetPk.columnName,
    targetIds,
  );

  if (nestedInclude) {
    await loadIncludes(dataSource, children, targetMeta, nestedInclude, depth + 1);
  }

  const childByPk = new Map<unknown, object>();
  for (const child of children) {
    const pk = (child as Row)[targetPk.propertyName];
    if (pk !== undefined && pk !== null) childByPk.set(pk, child);
  }

  const grouped = new Map<unknown, object[]>();
  for (const row of joinRows) {
    const tid = row[sides.targetSideFk];
    if (tid === undefined || tid === null) continue;
    const child = childByPk.get(tid);
    if (!child) continue;
    const pid = row[sides.parentSideFk];
    let bucket = grouped.get(pid);
    if (!bucket) {
      bucket = [];
      grouped.set(pid, bucket);
    }
    bucket.push(child);
  }

  for (const parent of parents) {
    parent[relation.propertyName] = grouped.get(parent[parentPk.propertyName]) ?? [];
  }
}
