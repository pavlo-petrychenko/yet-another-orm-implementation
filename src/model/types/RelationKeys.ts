import type { Relation } from "./Relation";

export type RelationKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends Relation<unknown> ? K : never;
}[keyof T];
