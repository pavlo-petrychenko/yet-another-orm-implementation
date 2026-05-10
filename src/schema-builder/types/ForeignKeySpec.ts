import type { ReferentialAction } from "@/schema-builder/types/ReferentialAction";

export interface ForeignKeySpec {
  name?: string;
  columns: string[];
  references: { table: string; columns: string[] };
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
}
