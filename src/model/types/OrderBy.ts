import type { ScalarKeys } from "@/model/types/Where";

export type SortDirection = "asc" | "desc";

export type OrderBy<T> = ReadonlyArray<{
  [K in ScalarKeys<T>]?: SortDirection;
}>;
