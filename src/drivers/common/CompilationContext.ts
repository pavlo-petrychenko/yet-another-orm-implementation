import type { ConditionClause, SelectQuery } from "@/query-builder";
import type { DialectUtils } from "@/drivers/common/DialectUtils";
import type { ParameterManager } from "@/drivers/common/ParameterManager";

export interface CompilationContext {
  readonly params: ParameterManager;
  readonly utils: DialectUtils;
  compileCondition(clause: ConditionClause): string;
  compileSelect(query: SelectQuery): string;
}
