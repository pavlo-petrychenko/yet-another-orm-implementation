import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";

export type ScalarKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends ScalarParam ? K : never;
}[keyof T];

export interface WhereOperators<V> {
  $eq?: V;
  $ne?: V;
  $gt?: V;
  $lt?: V;
  $gte?: V;
  $lte?: V;
  $in?: ReadonlyArray<V>;
  $nin?: ReadonlyArray<V>;
  $like?: V extends string ? string : never;
  $ilike?: V extends string ? string : never;
  $isNull?: boolean;
}

type FieldCondition<V> = V | WhereOperators<V>;

export type Where<T> = {
  [K in ScalarKeys<T>]?: FieldCondition<T[K]>;
} & {
  $and?: ReadonlyArray<Where<T>>;
  $or?: ReadonlyArray<Where<T>>;
  $not?: Where<T>;
};
