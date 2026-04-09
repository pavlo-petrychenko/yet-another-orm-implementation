import { type LimitClause } from "@/query-builder/types/clause/LimitClause/LimitClause";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class LimitClauseBuilder {
  private count: number | undefined;

  set(count: number): void {
    this.count = count;
  }

  isEmpty(): boolean {
    return this.count === undefined;
  }

  build(): LimitClause {
    return {
      type: ClauseType.Limit,
      count: this.count as number,
    };
  }
}
