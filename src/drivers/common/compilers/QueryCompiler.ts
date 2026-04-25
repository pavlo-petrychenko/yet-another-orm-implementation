import type { QueryCommon } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";

export interface QueryCompiler<TQuery extends QueryCommon> {
  compile(query: TQuery, ctx: CompilationContext): string;
}
