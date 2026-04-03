import { ClauseBuilder } from "@/query-builder/builders/ClauseBuilder/ClauseBuilder";
import { ConditionClause } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";

export class WhereBuilder implements ClauseBuilder {
  build(): ConditionClause {
    return {
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left: { name: "" },
      operator: "=",
      right: {name: ""}
    }
  }
}