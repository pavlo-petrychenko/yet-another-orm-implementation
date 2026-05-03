import type { Driver } from "@/drivers/common/Driver";
import type { EntityMetadata, EntityTarget } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { buildCascadePlan, type CascadeNode } from "@/model/internal/cascade/topoSort";
import { persistRelationLinks } from "@/model/internal/cascade/persistRelationLink";
import { ModelError } from "@/model/errors/ModelError";

export type CascadeMode = "insert" | "save";

// Returns true if `entity` carries any cascade-eligible relation values that need to be walked.
export function hasCascadeChildren(entity: object, metadata: EntityMetadata): boolean {
  const record = entity as Record<string, unknown>;
  for (const relation of metadata.relations) {
    if (!relation.cascade) continue;
    const value = record[relation.propertyName];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    return true;
  }
  return false;
}

export async function walkCascade(
  root: object,
  rootMetadata: EntityMetadata,
  ds: DataSource,
  tx: Driver,
  mode: CascadeMode,
): Promise<void> {
  const plan = buildCascadePlan(root, rootMetadata, ds);

  for (const node of plan.order) {
    applyFkBackfills(node);
    await persistNode(node, ds, tx, mode);
  }

  if (plan.m2mLinks.length > 0) {
    await persistRelationLinks(plan.m2mLinks, tx);
  }
}

function applyFkBackfills(node: CascadeNode): void {
  const target = node.entity as Record<string, unknown>;
  for (const fill of node.fkBackfills) {
    const source = fill.sourceEntity as Record<string, unknown>;
    const sourceValue = source[fill.sourceProperty];
    if (sourceValue === undefined || sourceValue === null) {
      throw new ModelError(
        "CASCADE_INVALID_CHILD",
        `Cascade FK backfill failed: source ${node.metadata.className}.${fill.targetProperty} is missing source value '${fill.sourceProperty}'`,
      );
    }
    if (target[fill.targetProperty] === undefined) {
      target[fill.targetProperty] = sourceValue;
    }
  }
}

async function persistNode(
  node: CascadeNode,
  ds: DataSource,
  tx: Driver,
  mode: CascadeMode,
): Promise<void> {
  const target = node.metadata.target as unknown as EntityTarget<object>;
  const repo = ds.getRepository(target);
  const record = node.entity as Record<string, unknown>;

  const pkColumns = node.metadata.primaryColumns;
  const hasAllPks = pkColumns.length > 0 && pkColumns.every((col) => {
    const value = record[col.propertyName];
    return value !== undefined && value !== null;
  });

  if (mode === "save" && hasAllPks) {
    await repo.saveWithDriver(node.entity, tx);
    return;
  }

  if (mode === "insert" && hasAllPks) {
    // PK already known: nothing to insert; treat as a "fixed" predecessor whose values are
    // already correct. Skip the SQL but leave the in-memory object as-is so dependents pick
    // up the FK values.
    return;
  }

  const fresh = await repo.insertWithDriver(node.entity, tx);
  Object.assign(node.entity, fresh);
}
