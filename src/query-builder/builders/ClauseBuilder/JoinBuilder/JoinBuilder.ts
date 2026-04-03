import { ClauseBuilder } from "@/query-builder/builders/ClauseBuilder/ClauseBuilder";
import { JoinClause, JoinType } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class JoinBuilder implements ClauseBuilder {
  build(): JoinClause {
    return {
      type: ClauseType.Join,
      joinType: JoinType.LEFT,
      table: {
        name: "",
      },
    }
  }
}