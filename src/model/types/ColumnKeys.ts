import type { RelationKeys } from "./RelationKeys";

type NonMethodKeys<T> = {
  [K in keyof T]-?: T[K] extends (...args: never[]) => unknown ? never : K;
}[keyof T];

export type ColumnKeys<T> = Exclude<NonMethodKeys<T>, RelationKeys<T>>;
