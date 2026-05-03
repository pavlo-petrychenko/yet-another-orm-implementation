import type { Relation } from "./Relation";
import type { RelationKeys } from "./RelationKeys";

export type RelationTarget<R> =
  R extends Relation<infer U>
    ? U extends ReadonlyArray<infer E> ? E : NonNullable<U>
    : R extends ReadonlyArray<infer U> ? U : NonNullable<R>;

export type IncludeConfig<T> = {
  [K in RelationKeys<T>]?:
    | true
    | { include?: IncludeConfig<RelationTarget<T[K]>> };
};
