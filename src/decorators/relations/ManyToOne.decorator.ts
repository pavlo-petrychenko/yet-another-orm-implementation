import "@/decorators/internal/symbolMetadataPolyfill";

import { stashRelation } from "@/decorators/internal/pendingMetadata";
import { MetadataError } from "@/metadata/errors/MetadataError";
import type {
  EntityTarget,
  JoinColumnOptions,
  RelationOptions,
} from "@/metadata/types";

type AnyClass = abstract new (...args: any[]) => any;

export interface ManyToOneOptions<TInst> {
  joinColumn?: JoinColumnOptions;
  inverseSide?: Extract<keyof TInst, string>;
  cascade?: boolean;
  nullable?: boolean;
}

export const ManyToOne = <Tgt extends AnyClass>(
  target: () => Tgt,
  options: ManyToOneOptions<InstanceType<Tgt>> = {},
) => {
  return <V extends InstanceType<Tgt> | undefined>(
    _value: undefined,
    context: ClassFieldDecoratorContext<unknown, V>,
  ): void => {
    if (typeof context.name !== "string") {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        "@ManyToOne does not support symbol-named fields",
      );
    }
    const relation: RelationOptions = {
      kind: "many-to-one",
      target: target as unknown as () => EntityTarget,
      inverseSide: options.inverseSide,
      joinColumn: options.joinColumn,
      cascade: options.cascade,
      nullable: options.nullable,
    };
    stashRelation(context.metadata, context.name, relation);
  };
};
