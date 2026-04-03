import { Clause } from "@/query-builder/types/clause/Clause";

export interface ClauseBuilder {
  build(): Clause;
}