import type { Query } from "@/query-builder";
import type { CompiledQuery } from "@/drivers/types/CompiledQuery";
import type { DialectUtils } from "@/drivers/common/DialectUtils";
import type { ParameterManager } from "@/drivers/common/ParameterManager";
import type { DdlQuery } from "@/schema-builder/types/DdlQuery";

export interface Dialect {
  buildQuery(query: Query): CompiledQuery;
  buildDdl(query: DdlQuery): CompiledQuery;
  getUtils(): DialectUtils;
  createParameterManager(): ParameterManager;
}
