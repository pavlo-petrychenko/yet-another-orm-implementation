import type { ColumnKeys } from "./ColumnKeys";

export type SelectMap<T> = {
  [K in ColumnKeys<T>]?: true;
};
