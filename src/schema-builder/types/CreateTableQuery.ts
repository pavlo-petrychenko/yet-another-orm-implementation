import type { ColumnSpec } from "@/schema-builder/types/ColumnSpec";
import type { DdlQueryCommon, DdlQueryType } from "@/schema-builder/types/DdlQuery";
import type { ForeignKeySpec } from "@/schema-builder/types/ForeignKeySpec";
import type { IndexSpec } from "@/schema-builder/types/IndexSpec";

export interface CreateTableQuery extends DdlQueryCommon {
  type: DdlQueryType.CREATE_TABLE;
  ifNotExists: boolean;
  columns: ColumnSpec[];
  primaryKey?: { columns: string[] };
  uniques: Array<{ name?: string; columns: string[] }>;
  indexes: IndexSpec[];
  foreignKeys: ForeignKeySpec[];
}
