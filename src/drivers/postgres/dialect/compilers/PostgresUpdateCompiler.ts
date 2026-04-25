import type { UpdateQuery } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { UpdateCompiler } from "@/drivers/common/compilers/UpdateCompiler";
import { DriverError } from "@/drivers/errors/DriverError";
import type { PostgresConditionCompiler } from "@/drivers/postgres/dialect/compilers/PostgresConditionCompiler";
import type { PostgresReturningCompiler } from "@/drivers/postgres/dialect/compilers/PostgresReturningCompiler";

// PostgreSQL does not support ORDER BY / LIMIT on UPDATE statements; if the AST carries them
// (the QueryBuilder allows them for MySQL parity) they are silently ignored here.
export class PostgresUpdateCompiler implements UpdateCompiler {
  constructor(
    private readonly conditionCompiler: PostgresConditionCompiler,
    private readonly returningCompiler: PostgresReturningCompiler,
  ) {}

  compile(query: UpdateQuery, ctx: CompilationContext): string {
    const entries = Object.entries(query.values);
    if (entries.length === 0) {
      throw new DriverError("UPDATE requires at least one column to set");
    }

    const setSql = entries
      .map(([col, value]) => `${ctx.utils.escapeIdentifier(col)} = ${ctx.params.add(value)}`)
      .join(", ");

    const parts: string[] = [
      `UPDATE ${ctx.utils.qualifyTable(query.table)}`,
      `SET ${setSql}`,
    ];

    if (query.where) {
      parts.push(`WHERE ${this.conditionCompiler.compileTopLevel(query.where, ctx)}`);
    }

    if (query.returning) {
      parts.push(this.returningCompiler.compile(query.returning, ctx));
    }

    return parts.join(" ");
  }
}
