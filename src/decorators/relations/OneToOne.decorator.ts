import "@/decorators/internal/symbolMetadataPolyfill";

import { stashRelation } from "@/decorators/internal/pendingMetadata";
import { MetadataError } from "@/metadata/errors/MetadataError";
import type {
  EntityTarget,
  JoinColumnOptions,
  RelationOptions,
} from "@/metadata/types";

type AnyClass = abstract new (...args: any[]) => any;

export interface OneToOneOptions<TInst> {
  joinColumn?: JoinColumnOptions;
  inverseSide?: Extract<keyof TInst, string>;
  cascade?: boolean;
  nullable?: boolean;
}

export const OneToOne = <Tgt extends AnyClass>(
  target: () => Tgt,
  options: OneToOneOptions<InstanceType<Tgt>> = {},
) => {
  return <V extends InstanceType<Tgt> | undefined>(
    _value: undefined,
    context: ClassFieldDecoratorContext<unknown, V>,
  ): void => {
    if (typeof context.name !== "string") {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        "@OneToOne does not support symbol-named fields",
      );
    }
    // if (!context.metadata) {
    //   throw new MetadataError(
    //     "MISSING_COLUMN_TYPE",
    //     `@OneToOne requires Symbol.metadata support: ${context.name}`,
    //   );
    // }
    const relation: RelationOptions = {
      kind: "one-to-one",
      target: target as unknown as () => EntityTarget,
      inverseSide: options.inverseSide,
      joinColumn: options.joinColumn,
      cascade: options.cascade,
      nullable: options.nullable,
    };
    stashRelation(context.metadata, context.name, relation);
  };
};
