import { type ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import { type ReturningClause } from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class ReturningClauseBuilder {
  private columns: ColumnDescription[] = [];

  set(...columns: ColumnDescription[]): void {
    this.columns = columns;
  }

  isEmpty(): boolean {
    return this.columns.length === 0;
  }

  build(): ReturningClause {
    return {
      type: ClauseType.Returning,
      columns: this.columns,
    };
  }
}
