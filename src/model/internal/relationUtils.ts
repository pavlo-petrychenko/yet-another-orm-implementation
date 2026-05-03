import type { ColumnMetadata, EntityMetadata, RelationMetadata } from "@/metadata/types";
import { ModelError } from "@/model/errors/ModelError";

export function findColumnByName(metadata: EntityMetadata, columnName: string): ColumnMetadata {
  for (const column of metadata.columns) {
    if (column.columnName === columnName) return column;
  }
  throw new ModelError(
    "UNKNOWN_PROPERTY",
    `No column with physical name "${columnName}" on ${metadata.className}`,
  );
}

export function singlePrimaryColumn(metadata: EntityMetadata): ColumnMetadata {
  const pks = metadata.primaryColumns;
  if (pks.length === 0) {
    throw new ModelError(
      "NO_PRIMARY_KEY",
      `Entity ${metadata.className} has no primary key declared`,
    );
  }
  if (pks.length > 1) {
    throw new ModelError(
      "MULTI_PK_NOT_SUPPORTED",
      `Entity ${metadata.className} has a composite primary key; relation loading requires a single-column primary key`,
    );
  }
  return pks[0];
}

export function collectKeys<E>(entities: readonly E[], extractKey: (entity: E) => unknown): unknown[] {
  const seen = new Set<unknown>();
  const result: unknown[] = [];
  for (const entity of entities) {
    const key = extractKey(entity);
    if (key === undefined || key === null) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

export function groupByKey<E>(
  entities: readonly E[],
  extractKey: (entity: E) => unknown,
): Map<unknown, E[]> {
  const grouped = new Map<unknown, E[]>();
  for (const entity of entities) {
    const key = extractKey(entity);
    if (key === undefined || key === null) continue;
    let bucket = grouped.get(key);
    if (!bucket) {
      bucket = [];
      grouped.set(key, bucket);
    }
    bucket.push(entity);
  }
  return grouped;
}

export function resolveInverseRelation(
  parentRelation: RelationMetadata,
  childMetadata: EntityMetadata,
): RelationMetadata {
  const inverseSide = parentRelation.inverseSide;
  if (inverseSide === undefined) {
    throw new ModelError(
      "INVERSE_SIDE_NOT_FOUND",
      `Relation ${parentRelation.target.name}.${parentRelation.propertyName} has no inverseSide declared`,
    );
  }
  const inverse = childMetadata.relationsByPropertyName.get(inverseSide);
  if (!inverse) {
    throw new ModelError(
      "INVERSE_SIDE_NOT_FOUND",
      `Inverse relation "${inverseSide}" not found on ${childMetadata.className}`,
    );
  }
  return inverse;
}
