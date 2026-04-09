import type { Query } from "@/query-builder/types";

export interface Builder {
  build(): Query;
}
