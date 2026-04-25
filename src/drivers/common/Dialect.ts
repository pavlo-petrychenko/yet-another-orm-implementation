import type { Query } from "@/query-builder";
import type { CompiledQuery } from "@/drivers/types/CompiledQuery";
import type { DialectUtils } from "@/drivers/common/DialectUtils";
import type { ParameterManager } from "@/drivers/common/ParameterManager";

export interface Dialect {
  buildQuery(query: Query): CompiledQuery;
  getUtils(): DialectUtils;
  createParameterManager(): ParameterManager;
}
