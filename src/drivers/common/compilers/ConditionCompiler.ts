import type { ConditionClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface ConditionCompiler {
  compile(clause: ConditionClause, ctx: CompilationContext): string;
}
