import { Query } from "@/query-builder/types";

export interface Builder {
  build(): Query;
}