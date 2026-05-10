import type { ColumnSpec, DefaultValue } from "@/schema-builder/types/ColumnSpec";
import type { ColumnType } from "@/schema-builder/types/ColumnType";
import type { DdlQueryCommon, DdlQueryType } from "@/schema-builder/types/DdlQuery";
import type { ForeignKeySpec } from "@/schema-builder/types/ForeignKeySpec";
import type { IndexSpec } from "@/schema-builder/types/IndexSpec";

export interface AlterColumnChanges {
  setNotNull?: boolean;
  setType?: ColumnType;
  setDefault?: DefaultValue | null;
}

export type AlterOperation =
  | { kind: "addColumn"; spec: ColumnSpec }
  | { kind: "dropColumn"; name: string; ifExists: boolean }
  | { kind: "renameColumn"; from: string; to: string }
  | { kind: "alterColumn"; name: string; changes: AlterColumnChanges }
  | { kind: "addIndex"; spec: IndexSpec }
  | { kind: "dropIndex"; name: string }
  | { kind: "addForeignKey"; spec: ForeignKeySpec }
  | { kind: "dropConstraint"; name: string };

export interface AlterTableQuery extends DdlQueryCommon {
  type: DdlQueryType.ALTER_TABLE;
  operations: AlterOperation[];
}
