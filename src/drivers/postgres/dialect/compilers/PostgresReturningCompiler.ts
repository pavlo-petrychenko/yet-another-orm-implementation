import type { ReturningClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { ReturningCompiler } from "@/drivers/common/compilers/ReturningCompiler";

export class PostgresReturningCompiler implements ReturningCompiler {
  compile(clause: ReturningClause, ctx: CompilationContext): string {
    const parts = clause.columns.map((c) => {
      const qualified = ctx.utils.qualifyColumn(c);
      return c.alias ? `${qualified} AS ${ctx.utils.escapeIdentifier(c.alias)}` : qualified;
    });
    return `RETURNING ${parts.join(", ")}`;
  }
}
