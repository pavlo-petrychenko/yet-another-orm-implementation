import { type ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import { type GroupByClause } from "@/query-builder/types/clause/GroupByClause/GroupByClause";
import { ClauseType } from "@/query-builder/types/clause/Clause";

export class GroupByClauseBuilder {
  private columns: ColumnDescription[] = [];

  set(...columns: ColumnDescription[]): void {
    this.columns = columns;
  }

  add(...columns: ColumnDescription[]): void {
    this.columns.push(...columns);
  }

  isEmpty(): boolean {
    return this.columns.length === 0;
  }

  build(): GroupByClause {
    return {
      type: ClauseType.GroupBy,
      columns: this.columns,
    };
  }
}
