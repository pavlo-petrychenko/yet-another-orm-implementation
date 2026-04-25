import type { JoinClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface JoinCompiler {
  compile(clause: JoinClause, ctx: CompilationContext): string;
}
