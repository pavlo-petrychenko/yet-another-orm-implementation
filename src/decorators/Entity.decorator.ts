import "@/decorators/internal/symbolMetadataPolyfill";

import { flushPendingMetadata } from "@/decorators/internal/pendingMetadata";
import { defaultMetadataStorage } from "@/metadata/storage";
import type { EntityOptions, EntityTarget } from "@/metadata/types";

type AnyClass = abstract new (...args: any[]) => unknown;

export const Entity = (options: EntityOptions = {}) => {
  return <T extends AnyClass>(value: T, context: ClassDecoratorContext<T>): void => {
    const target = value as unknown as EntityTarget;
    flushPendingMetadata(target, context.metadata);
    defaultMetadataStorage.registerEntity(target, options);
  };
};
