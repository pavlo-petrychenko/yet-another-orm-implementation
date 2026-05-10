import { ColumnBuilder } from "@/schema-builder/builders/ColumnBuilder";
import {
  ForeignKeyBuilder,
  type ForeignKeyParent,
} from "@/schema-builder/builders/ForeignKeyBuilder";
import type { ColumnSpec } from "@/schema-builder/types/ColumnSpec";
import type { ColumnType } from "@/schema-builder/types/ColumnType";
import type { CreateTableQuery } from "@/schema-builder/types/CreateTableQuery";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";
import type { ForeignKeySpec } from "@/schema-builder/types/ForeignKeySpec";
import type { IndexSpec } from "@/schema-builder/types/IndexSpec";

export class TableBuilder implements ForeignKeyParent {
  private readonly tableName: string;
  private readonly columnBuilders: ColumnBuilder[] = [];
  private readonly indexes: IndexSpec[] = [];
  private readonly uniques: Array<{ name?: string; columns: string[] }> = [];
  private readonly foreignKeys: ForeignKeySpec[] = [];
  private compositePrimary?: { columns: string[] };
  private ifNotExistsFlag = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // sugar
  id(name: string = "id"): ColumnBuilder {
    return this.addColumn(name, { kind: "serial" }).primary().notNull();
  }

  bigId(name: string = "id"): ColumnBuilder {
    return this.addColumn(name, { kind: "bigserial" }).primary().notNull();
  }

  timestamps(): void {
    this.addColumn("created_at", { kind: "timestamp", withTimezone: true })
      .notNull()
      .defaultRaw("NOW()");
    this.addColumn("updated_at", { kind: "timestamp", withTimezone: true })
      .notNull()
      .defaultRaw("NOW()");
  }

  // column types
  string(name: string, length?: number): ColumnBuilder {
    return this.addColumn(name, { kind: "varchar", length });
  }

  text(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "text" });
  }

  integer(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "integer" });
  }

  bigint(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "bigint" });
  }

  smallint(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "smallint" });
  }

  boolean(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "boolean" });
  }

  decimal(name: string, precision?: number, scale?: number): ColumnBuilder {
    return this.addColumn(name, { kind: "decimal", precision, scale });
  }

  timestamp(name: string, opts?: { withTimezone?: boolean }): ColumnBuilder {
    return this.addColumn(name, { kind: "timestamp", withTimezone: opts?.withTimezone });
  }

  date(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "date" });
  }

  time(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "time" });
  }

  json(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "json" });
  }

  jsonb(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "jsonb" });
  }

  uuid(name: string): ColumnBuilder {
    return this.addColumn(name, { kind: "uuid" });
  }

  raw(name: string, sql: string): ColumnBuilder {
    return this.addColumn(name, { kind: "raw", sql });
  }

  // table-level constraints
  primary(columns: string[]): this {
    this.compositePrimary = { columns };
    return this;
  }

  unique(columns: string[], opts?: { name?: string }): this {
    this.uniques.push({ name: opts?.name, columns });
    return this;
  }

  index(columns: string[], opts?: { name?: string; unique?: boolean }): this {
    this.indexes.push({
      name: opts?.name,
      columns,
      unique: opts?.unique ?? false,
    });
    return this;
  }

  foreign(columns: string | string[]): ForeignKeyBuilder {
    const cols = Array.isArray(columns) ? columns : [columns];
    return new ForeignKeyBuilder(this, cols);
  }

  ifNotExists(): this {
    this.ifNotExistsFlag = true;
    return this;
  }

  registerForeignKey(spec: ForeignKeySpec): ForeignKeySpec {
    this.foreignKeys.push(spec);
    return spec;
  }

  build(): CreateTableQuery {
    const columns: ColumnSpec[] = this.columnBuilders.map((b) => b.build());
    return {
      type: DdlQueryType.CREATE_TABLE,
      table: { name: this.tableName },
      ifNotExists: this.ifNotExistsFlag,
      columns,
      primaryKey: this.compositePrimary,
      uniques: this.uniques,
      indexes: this.indexes,
      foreignKeys: this.foreignKeys,
    };
  }

  private addColumn(name: string, columnType: ColumnType): ColumnBuilder {
    const cb = new ColumnBuilder(name, columnType);
    this.columnBuilders.push(cb);
    return cb;
  }
}
