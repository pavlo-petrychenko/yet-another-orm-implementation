import type { DdlQueryCommon, DdlQueryType } from "@/schema-builder/types/DdlQuery";

export interface DropTableQuery extends DdlQueryCommon {
  type: DdlQueryType.DROP_TABLE;
  ifExists: boolean;
  cascade: boolean;
}
