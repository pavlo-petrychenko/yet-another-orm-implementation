import type { EntityMetadata, EntityTarget } from "@/metadata/types";

export function hydrate<T extends object>(
  target: EntityTarget<T>,
  metadata: EntityMetadata,
  row: Record<string, unknown>,
): T {
  const prototype = (target as { prototype: object }).prototype;
  const instance = Object.create(prototype) as Record<string, unknown>;

  for (const column of metadata.columns) {
    if (Object.prototype.hasOwnProperty.call(row, column.columnName)) {
      instance[column.propertyName] = row[column.columnName];
    }
  }

  return instance as T;
}

export function hydrateMany<T extends object>(
  target: EntityTarget<T>,
  metadata: EntityMetadata,
  rows: ReadonlyArray<Record<string, unknown>>,
): T[] {
  const result: T[] = [];
  for (const row of rows) {
    result.push(hydrate(target, metadata, row));
  }
  return result;
}
