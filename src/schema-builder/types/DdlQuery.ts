import type { TableDescription } from "@/query-builder";
import type { CreateTableQuery } from "@/schema-builder/types/CreateTableQuery";
import type { AlterTableQuery } from "@/schema-builder/types/AlterTableQuery";
import type { DropTableQuery } from "@/schema-builder/types/DropTableQuery";
import type { RenameTableQuery } from "@/schema-builder/types/RenameTableQuery";

export enum DdlQueryType {
  CREATE_TABLE = "CREATE_TABLE",
  ALTER_TABLE = "ALTER_TABLE",
  DROP_TABLE = "DROP_TABLE",
  RENAME_TABLE = "RENAME_TABLE",
}

export interface DdlQueryCommon {
  type: DdlQueryType;
  table: TableDescription;
}

export type DdlQuery =
  | CreateTableQuery
  | AlterTableQuery
  | DropTableQuery
  | RenameTableQuery;
