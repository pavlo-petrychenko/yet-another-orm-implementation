import { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
import type { Driver } from "@/drivers/common/Driver";
import { ModelError } from "@/model/errors/ModelError";
import type { M2MLinkPlan } from "@/model/internal/cascade/topoSort";

// Writes the (joinColumn, inverseJoinColumn) rows for every queued M2M link plan.
// One INSERT per join table, batching all the link rows for that table into a single statement.
// `ON CONFLICT DO NOTHING` against the (joinColumn, inverseJoinColumn) pair makes the operation
// idempotent — re-running cascade on the same in-memory tree won't fail with a unique violation.
export async function persistRelationLinks(
  links: ReadonlyArray<M2MLinkPlan>,
  tx: Driver,
): Promise<void> {
  if (links.length === 0) return;

  const byTable = new Map<string, M2MLinkPlan[]>();
  for (const link of links) {
    let bucket = byTable.get(link.joinTable);
    if (!bucket) {
      bucket = [];
      byTable.set(link.joinTable, bucket);
    }
    bucket.push(link);
  }

  const qbFactory = new QueryBuilder();
  for (const [tableName, group] of byTable) {
    const rows: Record<string, unknown>[] = group.map((link) => ({
      [link.joinColumn]: requirePk(link.ownerEntity, link.ownerMetadata),
      [link.inverseJoinColumn]: requirePk(link.inverseEntity, link.inverseMetadata),
    }));

    const first = group[0];
    const qb = qbFactory.insert({ name: tableName });
    qb.valuesList(rows).onConflict({
      targetColumns: [first.joinColumn, first.inverseJoinColumn],
      updateColumns: "do-nothing",
    });
    await tx.query(qb.build());
  }
}

function requirePk(entity: object, metadata: { primaryColumns: ReadonlyArray<{ propertyName: string; columnName: string }>; className: string }): unknown {
  if (metadata.primaryColumns.length !== 1) {
    throw new ModelError(
      "MULTI_PK_NOT_SUPPORTED",
      `M2M link write requires single-column PK on ${metadata.className}`,
    );
  }
  const pk = metadata.primaryColumns[0];
  const value = (entity as Record<string, unknown>)[pk.propertyName];
  if (value === undefined || value === null) {
    throw new ModelError(
      "CASCADE_INVALID_CHILD",
      `M2M link write: ${metadata.className} has no PK value yet`,
    );
  }
  return value;
}
