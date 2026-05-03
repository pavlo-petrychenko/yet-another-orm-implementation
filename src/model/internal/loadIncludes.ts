import type { EntityMetadata } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { relationLoaders, type Row } from "@/model/internal/relationLoaders";
import type { IncludeConfig } from "@/model/types/IncludeConfig";

export const MAX_INCLUDE_DEPTH = 10;

export async function loadIncludes<T extends object>(
  dataSource: DataSource,
  parents: readonly T[],
  metadata: EntityMetadata,
  include: IncludeConfig<T>,
  depth: number,
): Promise<void> {
  if (parents.length === 0) return;
  if (depth > MAX_INCLUDE_DEPTH) {
    throw new ModelError(
      "INCLUDE_DEPTH_EXCEEDED",
      `Include nesting exceeded the maximum depth of ${String(MAX_INCLUDE_DEPTH)}`,
    );
  }

  const parentRows = parents as readonly Row[];

  for (const propertyName of Object.keys(include)) {
    const node = (include as Record<string, unknown>)[propertyName];
    if (node === undefined || node === false) continue;

    const relation = metadata.relationsByPropertyName.get(propertyName);
    if (!relation) {
      throw new ModelError(
        "UNKNOWN_RELATION",
        `Property "${propertyName}" is not a registered relation on ${metadata.className}`,
      );
    }

    let nestedInclude: IncludeConfig<unknown> | undefined;
    if (node !== true) {
      nestedInclude = (node as { include?: IncludeConfig<unknown> }).include;
    }

    const loader = relationLoaders[relation.kind];
    await loader(dataSource, parentRows, metadata, relation, nestedInclude, depth);
  }
}
