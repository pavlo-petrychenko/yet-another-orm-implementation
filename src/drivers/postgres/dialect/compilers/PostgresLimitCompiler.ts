import type { LimitClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { LimitCompiler } from "@/drivers/common/compilers/LimitCompiler";

export class PostgresLimitCompiler implements LimitCompiler {
  compile(clause: LimitClause, _ctx: CompilationContext): string {
    return `LIMIT ${String(clause.count)}`;
  }
}
