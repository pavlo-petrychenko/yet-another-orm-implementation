import { ClauseType } from "@/query-builder/types/clause/Clause";
import type { JoinClause } from "@/query-builder/types/clause/JoinClause/JoinClause";
import { type JoinType } from "@/query-builder/types/clause/JoinClause/typedefs";
import { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
import type { TableDescription } from "@/query-builder/types/common/TableDescription";

export class JoinClauseBuilder {
  private joins: JoinClause[] = [];

  add(
    joinType: JoinType,
    table: TableDescription,
    onCallback?: (builder: ConditionBuilder) => void,
  ): this {
    const conditionBuilder = new ConditionBuilder();
    if (onCallback) {
      onCallback(conditionBuilder);
    }
    const onCondition = onCallback ? conditionBuilder.build() : undefined;

    this.joins.push({
      type: ClauseType.Join,
      joinType,
      table,
      ...(onCondition && { on: onCondition }),
    });

    return this;
  }

  isEmpty(): boolean {
    return this.joins.length === 0;
  }

  build(): JoinClause[] {
    return this.joins;
  }
}
