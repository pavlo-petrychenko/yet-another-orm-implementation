import type { ReturningClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface ReturningCompiler {
  compile(clause: ReturningClause, ctx: CompilationContext): string;
}
