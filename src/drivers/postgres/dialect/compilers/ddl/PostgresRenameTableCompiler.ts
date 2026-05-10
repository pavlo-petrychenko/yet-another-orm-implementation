import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { RenameTableQuery } from "@/schema-builder/types/RenameTableQuery";

export class PostgresRenameTableCompiler {
  compile(query: RenameTableQuery, ctx: CompilationContext): string {
    const from = ctx.utils.qualifyTable(query.table);
    const to = ctx.utils.escapeIdentifier(query.to);
    return `ALTER TABLE ${from} RENAME TO ${to}`;
  }
}
