import { ClauseBuilder } from "@/query-builder/builders/ClauseBuilder/ClauseBuilder";
import { OrderByClause } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class OrderByBuilder implements ClauseBuilder {
  build(): OrderByClause {
    return {
      type: ClauseType.OrderBy,
      orders: []
    }
  }
}