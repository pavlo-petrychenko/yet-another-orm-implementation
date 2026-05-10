import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { DropTableQuery } from "@/schema-builder/types/DropTableQuery";

export class PostgresDropTableCompiler {
  compile(query: DropTableQuery, ctx: CompilationContext): string {
    const ifExists = query.ifExists ? "IF EXISTS " : "";
    const cascade = query.cascade ? " CASCADE" : "";
    return `DROP TABLE ${ifExists}${ctx.utils.qualifyTable(query.table)}${cascade}`;
  }
}
