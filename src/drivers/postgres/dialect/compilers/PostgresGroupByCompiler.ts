import type { GroupByClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { GroupByCompiler } from "@/drivers/common/compilers/GroupByCompiler";

export class PostgresGroupByCompiler implements GroupByCompiler {
  compile(clause: GroupByClause, ctx: CompilationContext): string {
    const parts = clause.columns.map((c) => ctx.utils.qualifyColumn(c));
    return `GROUP BY ${parts.join(", ")}`;
  }
}
