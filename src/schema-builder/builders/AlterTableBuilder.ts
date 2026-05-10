import { AlterColumnBuilder } from "@/schema-builder/builders/AlterColumnBuilder";
import { ColumnBuilder } from "@/schema-builder/builders/ColumnBuilder";
import type { AlterOperation, AlterTableQuery } from "@/schema-builder/types/AlterTableQuery";
import type { ColumnType } from "@/schema-builder/types/ColumnType";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";
import type { ForeignKeySpec } from "@/schema-builder/types/ForeignKeySpec";
import type { ReferentialAction } from "@/schema-builder/types/ReferentialAction";

export interface AddForeignKeyInput {
  columns: string[];
  references: { table: string; columns: string[] };
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
  name?: string;
}

export class AlterTableBuilder {
  private readonly tableName: string;
  private readonly operations: AlterOperation[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  addColumn(name: string, columnType: ColumnType): ColumnBuilder {
    const cb = new ColumnBuilder(name, columnType);
    this.operations.push({ kind: "addColumn", spec: cb.build() });
    return cb;
  }

  dropColumn(name: string, opts?: { ifExists?: boolean }): this {
    this.operations.push({
      kind: "dropColumn",
      name,
      ifExists: opts?.ifExists ?? false,
    });
    return this;
  }

  renameColumn(from: string, to: string): this {
    this.operations.push({ kind: "renameColumn", from, to });
    return this;
  }

  alterColumn(name: string, build: (c: AlterColumnBuilder) => void): this {
    const ab = new AlterColumnBuilder();
    build(ab);
    this.operations.push({ kind: "alterColumn", name, changes: ab.build() });
    return this;
  }

  addIndex(columns: string[], opts?: { name?: string; unique?: boolean }): this {
    this.operations.push({
      kind: "addIndex",
      spec: {
        name: opts?.name,
        columns,
        unique: opts?.unique ?? false,
      },
    });
    return this;
  }

  dropIndex(name: string): this {
    this.operations.push({ kind: "dropIndex", name });
    return this;
  }

  addForeignKey(input: AddForeignKeyInput): this {
    const spec: ForeignKeySpec = {
      name: input.name,
      columns: input.columns,
      references: input.references,
      onDelete: input.onDelete,
      onUpdate: input.onUpdate,
    };
    this.operations.push({ kind: "addForeignKey", spec });
    return this;
  }

  dropConstraint(name: string): this {
    this.operations.push({ kind: "dropConstraint", name });
    return this;
  }

  build(): AlterTableQuery {
    return {
      type: DdlQueryType.ALTER_TABLE,
      table: { name: this.tableName },
      operations: this.operations,
    };
  }
}
