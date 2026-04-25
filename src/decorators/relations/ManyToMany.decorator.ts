import "@/decorators/internal/symbolMetadataPolyfill";

import { stashRelation } from "@/decorators/internal/pendingMetadata";
import { MetadataError } from "@/metadata/errors/MetadataError";
import type {
  EntityTarget,
  JoinTableOptions,
  RelationOptions,
} from "@/metadata/types";

type AnyClass = abstract new (...args: any[]) => any;

export interface ManyToManyOptions<TInst> {
  joinTable?: JoinTableOptions;
  inverseSide?: Extract<keyof TInst, string>;
  cascade?: boolean;
}

export const ManyToMany = <Tgt extends AnyClass>(
  target: () => Tgt,
  options: ManyToManyOptions<InstanceType<Tgt>> = {},
) => {
  return <V extends ReadonlyArray<InstanceType<Tgt>>>(
    _value: undefined,
    context: ClassFieldDecoratorContext<unknown, V>,
  ): void => {
    if (typeof context.name !== "string") {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        "@ManyToMany does not support symbol-named fields",
      );
    }
    const relation: RelationOptions = {
      kind: "many-to-many",
      target: target as unknown as () => EntityTarget,
      inverseSide: options.inverseSide,
      joinTable: options.joinTable,
      cascade: options.cascade,
    };
    stashRelation(context.metadata, context.name, relation);
  };
};
