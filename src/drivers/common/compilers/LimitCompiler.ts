import type { LimitClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface LimitCompiler {
  compile(clause: LimitClause, ctx: CompilationContext): string;
}
