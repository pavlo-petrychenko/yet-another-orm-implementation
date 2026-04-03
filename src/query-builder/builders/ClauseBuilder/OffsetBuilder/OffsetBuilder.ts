import { ClauseBuilder } from "@/query-builder/builders/ClauseBuilder/ClauseBuilder";
import { OffsetClause } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class OffsetBuilder implements ClauseBuilder {
  build(): OffsetClause {
    return {
      type: ClauseType.Offset,
      count: 0,
    }
  }
}