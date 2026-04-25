import type { DeleteQuery } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { DeleteCompiler } from "@/drivers/common/compilers/DeleteCompiler";
import type { PostgresConditionCompiler } from "@/drivers/postgres/dialect/compilers/PostgresConditionCompiler";
import type { PostgresReturningCompiler } from "@/drivers/postgres/dialect/compilers/PostgresReturningCompiler";

// PostgreSQL does not support ORDER BY / LIMIT on DELETE statements; the AST may carry them for
// MySQL parity but they are silently ignored here.
export class PostgresDeleteCompiler implements DeleteCompiler {
  constructor(
    private readonly conditionCompiler: PostgresConditionCompiler,
    private readonly returningCompiler: PostgresReturningCompiler,
  ) {}

  compile(query: DeleteQuery, ctx: CompilationContext): string {
    const parts: string[] = [`DELETE FROM ${ctx.utils.qualifyTable(query.table)}`];

    if (query.where) {
      parts.push(`WHERE ${this.conditionCompiler.compileTopLevel(query.where, ctx)}`);
    }

    if (query.returning) {
      parts.push(this.returningCompiler.compile(query.returning, ctx));
    }

    return parts.join(" ");
  }
}
