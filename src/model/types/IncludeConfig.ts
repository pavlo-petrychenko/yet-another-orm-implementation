export type RelationTarget<R> =
  R extends ReadonlyArray<infer U> ? U : NonNullable<R>;

export type IncludeConfig<T> = {
  [K in keyof T]?:
    | true
    | { include?: IncludeConfig<RelationTarget<T[K]>> };
};
