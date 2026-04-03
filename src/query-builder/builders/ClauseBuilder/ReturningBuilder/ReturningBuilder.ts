import { ClauseBuilder } from "@/query-builder/builders/ClauseBuilder/ClauseBuilder";
import { ReturningClause } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class ReturningBuilder implements ClauseBuilder {
  build(): ReturningClause {
    return {
      type: ClauseType.Returning,
      columns: [],
    }
  }
}