import "@/decorators/internal/symbolMetadataPolyfill";

import { stashRelation } from "@/decorators/internal/pendingMetadata";
import { MetadataError } from "@/metadata/errors/MetadataError";
import type { EntityTarget, RelationOptions } from "@/metadata/types";

type AnyClass = abstract new (...args: any[]) => any;

export interface OneToManyOptions<TInst> {
  inverseSide: Extract<keyof TInst, string>;
  cascade?: boolean;
}

export const OneToMany = <Tgt extends AnyClass>(
  target: () => Tgt,
  options: OneToManyOptions<InstanceType<Tgt>>,
) => {
  return <V extends ReadonlyArray<InstanceType<Tgt>>>(
    _value: undefined,
    context: ClassFieldDecoratorContext<unknown, V>,
  ): void => {
    if (typeof context.name !== "string") {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        "@OneToMany does not support symbol-named fields",
      );
    }
    const relation: RelationOptions = {
      kind: "one-to-many",
      target: target as unknown as () => EntityTarget,
      inverseSide: options.inverseSide,
      cascade: options.cascade,
    };
    stashRelation(context.metadata, context.name, relation);
  };
};
