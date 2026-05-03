import type { EntityMetadata } from "@/metadata/types";

interface ExtractOptions {
  skipUndefined?: boolean;
}

export function extractColumnValues<T>(
  data: Partial<T>,
  metadata: EntityMetadata,
  options: ExtractOptions = {},
): Record<string, unknown> {
  const shouldSkipUndefined = options.skipUndefined ?? true;
  const result: Record<string, unknown> = {};

  for (const propertyName of Object.keys(data) as Array<keyof T & string>) {
    const column = metadata.columnsByPropertyName.get(propertyName);
    if (!column) continue;

    const value = data[propertyName];
    if (shouldSkipUndefined && value === undefined) continue;

    result[column.columnName] = value;
  }

  return result;
}
