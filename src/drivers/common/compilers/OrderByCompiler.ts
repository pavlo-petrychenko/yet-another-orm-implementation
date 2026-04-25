import type { OrderByClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface OrderByCompiler {
  compile(clause: OrderByClause, ctx: CompilationContext): string;
}
