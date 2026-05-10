import type { AlterColumnChanges } from "@/schema-builder/types/AlterTableQuery";
import type { ColumnType } from "@/schema-builder/types/ColumnType";

export class AlterColumnBuilder {
  private readonly changes: AlterColumnChanges = {};

  setNotNull(value: boolean): this {
    this.changes.setNotNull = value;
    return this;
  }

  setType(columnType: ColumnType): this {
    this.changes.setType = columnType;
    return this;
  }

  setDefault(value: unknown): this {
    this.changes.setDefault = { kind: "value", value };
    return this;
  }

  setDefaultRaw(sql: string): this {
    this.changes.setDefault = { kind: "raw", sql };
    return this;
  }

  dropDefault(): this {
    this.changes.setDefault = null;
    return this;
  }

  build(): AlterColumnChanges {
    return this.changes;
  }
}
