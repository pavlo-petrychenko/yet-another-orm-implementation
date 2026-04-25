import type { OffsetClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { OffsetCompiler } from "@/drivers/common/compilers/OffsetCompiler";

export class PostgresOffsetCompiler implements OffsetCompiler {
  compile(clause: OffsetClause, _ctx: CompilationContext): string {
    return `OFFSET ${String(clause.count)}`;
  }
}
