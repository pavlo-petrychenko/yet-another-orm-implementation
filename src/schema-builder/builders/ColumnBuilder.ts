import type { ColumnReference, ColumnSpec, DefaultValue } from "@/schema-builder/types/ColumnSpec";
import type { ColumnType } from "@/schema-builder/types/ColumnType";
import type { ReferentialAction } from "@/schema-builder/types/ReferentialAction";

export class ColumnBuilder {
  private readonly spec: ColumnSpec;

  constructor(name: string, columnType: ColumnType) {
    this.spec = {
      name,
      columnType,
      notNull: false,
      primary: false,
      unique: false,
    };
  }

  notNull(): this {
    this.spec.notNull = true;
    return this;
  }

  nullable(): this {
    this.spec.notNull = false;
    return this;
  }

  default(value: unknown): this {
    this.spec.default = { kind: "value", value };
    return this;
  }

  defaultRaw(sql: string): this {
    this.spec.default = { kind: "raw", sql };
    return this;
  }

  unique(): this {
    this.spec.unique = true;
    return this;
  }

  primary(): this {
    this.spec.primary = true;
    return this;
  }

  references(table: string, column: string = "id"): this {
    const ref: ColumnReference = { table, column };
    if (this.spec.references) {
      ref.onDelete = this.spec.references.onDelete;
      ref.onUpdate = this.spec.references.onUpdate;
    }
    this.spec.references = ref;
    return this;
  }

  onDelete(action: ReferentialAction): this {
    if (!this.spec.references) {
      this.spec.references = { table: "", column: "id" };
    }
    this.spec.references.onDelete = action;
    return this;
  }

  onUpdate(action: ReferentialAction): this {
    if (!this.spec.references) {
      this.spec.references = { table: "", column: "id" };
    }
    this.spec.references.onUpdate = action;
    return this;
  }

  setDefault(d: DefaultValue): this {
    this.spec.default = d;
    return this;
  }

  build(): ColumnSpec {
    return this.spec;
  }
}
