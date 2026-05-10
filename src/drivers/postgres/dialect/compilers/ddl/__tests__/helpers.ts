import type { CompilationContext } from "@/drivers/common/CompilationContext";
import { PostgresParameterManager } from "@/drivers/postgres/dialect/PostgresParameterManager";
import { PostgresDialectUtils } from "@/drivers/postgres/dialect/PostgresDialectUtils";

export function createDdlCtx(): {
  ctx: CompilationContext;
  params: PostgresParameterManager;
} {
  const params = new PostgresParameterManager();
  const utils = new PostgresDialectUtils();
  const ctx: CompilationContext = {
    params,
    utils,
    compileCondition: () => {
      throw new Error("DDL compilation does not support conditions");
    },
    compileSelect: () => {
      throw new Error("DDL compilation does not support nested SELECTs");
    },
  };
  return { ctx, params };
}
