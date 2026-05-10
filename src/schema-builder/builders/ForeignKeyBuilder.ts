import type { ForeignKeySpec } from "@/schema-builder/types/ForeignKeySpec";
import type { ReferentialAction } from "@/schema-builder/types/ReferentialAction";

export interface ForeignKeyParent {
  registerForeignKey(spec: ForeignKeySpec): ForeignKeySpec;
}

export class ForeignKeyBuilder {
  private readonly columns: string[];
  private readonly parent: ForeignKeyParent;
  private spec?: ForeignKeySpec;
  private name?: string;
  private pendingOnDelete?: ReferentialAction;
  private pendingOnUpdate?: ReferentialAction;

  constructor(parent: ForeignKeyParent, columns: string[]) {
    this.parent = parent;
    this.columns = columns;
  }

  withName(name: string): this {
    this.name = name;
    if (this.spec) this.spec.name = name;
    return this;
  }

  references(table: string, column?: string | string[]): this {
    const refColumns = column == null
      ? ["id"]
      : Array.isArray(column)
        ? column
        : [column];
    const draft: ForeignKeySpec = {
      name: this.name,
      columns: this.columns,
      references: { table, columns: refColumns },
      onDelete: this.pendingOnDelete,
      onUpdate: this.pendingOnUpdate,
    };
    this.spec = this.parent.registerForeignKey(draft);
    return this;
  }

  onDelete(action: ReferentialAction): this {
    if (this.spec) {
      this.spec.onDelete = action;
    } else {
      this.pendingOnDelete = action;
    }
    return this;
  }

  onUpdate(action: ReferentialAction): this {
    if (this.spec) {
      this.spec.onUpdate = action;
    } else {
      this.pendingOnUpdate = action;
    }
    return this;
  }
}
