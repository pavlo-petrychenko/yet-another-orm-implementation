import type { DdlQueryCommon, DdlQueryType } from "@/schema-builder/types/DdlQuery";

export interface RenameTableQuery extends DdlQueryCommon {
  type: DdlQueryType.RENAME_TABLE;
  to: string;
}
