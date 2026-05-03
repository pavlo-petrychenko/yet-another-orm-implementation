import type { EntityMetadata, EntityTarget, RelationMetadata } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { loadIncludes } from "@/model/internal/loadIncludes";
import { collectKeys, findColumnByName } from "@/model/internal/relationUtils";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

import { fetchByColumnIn, type Row } from "./shared";

export async function loadManyToOne(
  dataSource: DataSource,
  parents: readonly Row[],
  parentMeta: EntityMetadata,
  relation: RelationMetadata,
  nestedInclude: IncludeConfig<unknown> | undefined,
  depth: number,
): Promise<void> {
  const fk = relation.joinColumn;
  if (!fk) {
    throw new ModelError(
      "INVERSE_SIDE_NOT_FOUND",
      `Many-to-one relation ${parentMeta.className}.${relation.propertyName} is missing a join column`,
    );
  }

  const target = relation.resolveTarget();
  const targetMeta = dataSource.getMetadata(target);
  const fkColumn = findColumnByName(parentMeta, fk.columnName);
  const referencedColumn = findColumnByName(targetMeta, fk.referencedColumnName);

  const ids = collectKeys(parents, (p) => p[fkColumn.propertyName]);
  if (ids.length === 0) {
    for (const parent of parents) {
      parent[relation.propertyName] = undefined;
    }
    return;
  }

  const children = await fetchByColumnIn(
    dataSource,
    target as EntityTarget<object>,
    targetMeta,
    referencedColumn.columnName,
    ids,
  );

  if (nestedInclude) {
    await loadIncludes(dataSource, children, targetMeta, nestedInclude, depth + 1);
  }

  const byKey = new Map<unknown, object>();
  for (const child of children) {
    const key = (child as Row)[referencedColumn.propertyName];
    if (key !== undefined && key !== null) byKey.set(key, child);
  }
  for (const parent of parents) {
    const fkValue = parent[fkColumn.propertyName];
    parent[relation.propertyName] = fkValue == null ? undefined : (byKey.get(fkValue) ?? undefined);
  }
}
