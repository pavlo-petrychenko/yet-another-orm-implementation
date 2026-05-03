import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";
import { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
import type { EntityMetadata, EntityTarget } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { hydrateMany } from "@/model/hydrate";

export type Row = Record<string, unknown>;

export function allColumnDescriptions(metadata: EntityMetadata): ColumnDescription[] {
  return metadata.columns.map((column) => ({
    name: column.columnName,
    table: metadata.tableName,
  }));
}

export async function fetchByColumnIn<T extends object>(
  dataSource: DataSource,
  target: EntityTarget<T>,
  metadata: EntityMetadata,
  columnName: string,
  ids: readonly unknown[],
): Promise<T[]> {
  const qb = new QueryBuilder().select({ name: metadata.tableName });
  qb.select(...allColumnDescriptions(metadata));
  qb.where((b) => {
    b.whereIn({ name: columnName, table: metadata.tableName }, ids as ScalarParam[]);
  });

  const result = await dataSource.getDriver().query(qb.build());
  return hydrateMany(target, metadata, result.rows);
}
