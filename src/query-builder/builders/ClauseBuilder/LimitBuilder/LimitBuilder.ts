import { ClauseBuilder } from "@/query-builder/builders/ClauseBuilder/ClauseBuilder";
import { LimitClause } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class LimitBuilder implements ClauseBuilder {
  build(): LimitClause {
    return {
      type: ClauseType.Limit,
      count: 0,
    }
  }
}