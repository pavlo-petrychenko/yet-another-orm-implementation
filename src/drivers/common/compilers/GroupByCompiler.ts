import type { GroupByClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface GroupByCompiler {
  compile(clause: GroupByClause, ctx: CompilationContext): string;
}
