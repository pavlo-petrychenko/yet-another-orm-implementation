import type { OffsetClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface OffsetCompiler {
  compile(clause: OffsetClause, ctx: CompilationContext): string;
}
