import type { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
import { OrderDirection } from "@/query-builder/types/common/OrderDirection";
import type { EntityMetadata } from "@/metadata/types";
import { ModelError } from "@/model/errors/ModelError";
import type { OrderBy } from "@/model/types/OrderBy";

export function compileOrderBy<T>(
  orderBy: OrderBy<T>,
  metadata: EntityMetadata,
  builder: SelectQueryBuilder,
): void {
  for (const entry of orderBy) {
    const keys = Object.keys(entry).filter((k) => entry[k as keyof typeof entry] !== undefined);
    if (keys.length !== 1) {
      throw new ModelError(
        "INVALID_ORDER_BY",
        `Each orderBy entry must have exactly one key, got ${String(keys.length)}`,
      );
    }

    const propertyName = keys[0];
    const direction = entry[propertyName as keyof typeof entry];

    const column = metadata.columnsByPropertyName.get(propertyName);
    if (!column) {
      throw new ModelError(
        "UNKNOWN_PROPERTY",
        `Property "${propertyName}" is not a registered column on ${metadata.className}`,
      );
    }

    builder.orderBy(
      { name: column.columnName, table: metadata.tableName },
      direction === "desc" ? OrderDirection.DESC : OrderDirection.ASC,
    );
  }
}
