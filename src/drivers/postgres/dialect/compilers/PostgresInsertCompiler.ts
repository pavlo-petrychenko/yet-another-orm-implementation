import type { InsertQuery } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { InsertCompiler } from "@/drivers/common/compilers/InsertCompiler";
import { DriverError } from "@/drivers/errors/DriverError";
import type { PostgresReturningCompiler } from "@/drivers/postgres/dialect/compilers/PostgresReturningCompiler";

export class PostgresInsertCompiler implements InsertCompiler {
  constructor(private readonly returningCompiler: PostgresReturningCompiler) {}

  compile(query: InsertQuery, ctx: CompilationContext): string {
    if (query.values.length === 0) {
      throw new DriverError("INSERT requires at least one row");
    }

    const columnNames = Object.keys(query.values[0]);
    if (columnNames.length === 0) {
      throw new DriverError("INSERT requires at least one column");
    }

    const columnsSql = columnNames.map((c) => ctx.utils.escapeIdentifier(c)).join(", ");

    const rowsSql = query.values
      .map((row) => {
        const placeholders = columnNames.map((c) => ctx.params.add(row[c]));
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    const parts: string[] = [
      `INSERT INTO ${ctx.utils.qualifyTable(query.table)} (${columnsSql})`,
      `VALUES ${rowsSql}`,
    ];

    if (query.returning) {
      parts.push(this.returningCompiler.compile(query.returning, ctx));
    }

    return parts.join(" ");
  }
}
