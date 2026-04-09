import { type OffsetClause } from "@/query-builder/types/clause/OffsetClause/OffsetClause";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class OffsetClauseBuilder {
  private count: number | undefined;

  set(count: number): void {
    this.count = count;
  }

  isEmpty(): boolean {
    return this.count === undefined;
  }

  build(): OffsetClause {
    return {
      type: ClauseType.Offset,
      count: this.count as number,
    };
  }
}
