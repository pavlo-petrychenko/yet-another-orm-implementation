import { ClauseBuilder } from "@/query-builder/builders/ClauseBuilder/ClauseBuilder";
import { GroupByClause } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class GroupByBuilder implements ClauseBuilder {
  build(): GroupByClause {
    return {
      type: ClauseType.GroupBy,
      columns: [],
    }
  }
}