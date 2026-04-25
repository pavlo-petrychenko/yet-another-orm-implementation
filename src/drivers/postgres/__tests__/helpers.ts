import type { ConditionClause, SelectQuery } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import { PostgresParameterManager } from "@/drivers/postgres/dialect/PostgresParameterManager";
import { PostgresDialectUtils } from "@/drivers/postgres/dialect/PostgresDialectUtils";
import { PostgresConditionCompiler } from "@/drivers/postgres/dialect/compilers/PostgresConditionCompiler";

interface TestContextHandles {
  ctx: CompilationContext;
  params: PostgresParameterManager;
  conditionCompiler: PostgresConditionCompiler;
}

interface TestContextOptions {
  compileSelect?: (query: SelectQuery) => string;
}

export function createTestContext(opts: TestContextOptions = {}): TestContextHandles {
  const params = new PostgresParameterManager();
  const utils = new PostgresDialectUtils();
  const conditionCompiler = new PostgresConditionCompiler();
  const ctx: CompilationContext = {
    params,
    utils,
    compileCondition: (clause: ConditionClause) => conditionCompiler.compile(clause, ctx),
    compileSelect: opts.compileSelect ?? ((_q: SelectQuery): string => "SELECT 1"),
  };
  return { ctx, params, conditionCompiler };
}
