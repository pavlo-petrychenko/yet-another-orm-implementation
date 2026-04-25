import "@/decorators/internal/symbolMetadataPolyfill";

import { stashColumn } from "@/decorators/internal/pendingMetadata";
import { MetadataError } from "@/metadata/errors/MetadataError";
import type { ColumnOptions } from "@/metadata/types";

export const Column = <V = unknown>(options: ColumnOptions) => {
  return (_value: undefined, context: ClassFieldDecoratorContext<unknown, V>): void => {
    if (typeof context.name !== "string") {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        "@Column does not support symbol-named fields",
      );
    }
    if (context.static) {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        `@Column does not support static fields: ${context.name}`,
      );
    }
    if (context.private) {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        `@Column does not support private fields: ${context.name}`,
      );
    }
    stashColumn(context.metadata, context.name, options);
  };
};
