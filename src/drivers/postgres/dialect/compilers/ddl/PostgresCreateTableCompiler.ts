import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { PostgresColumnTypeCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresColumnTypeCompiler";
import { compileReferentialAction } from "@/drivers/postgres/dialect/compilers/ddl/referentialAction";
import type { ColumnSpec, DefaultValue } from "@/schema-builder/types/ColumnSpec";
import type { CreateTableQuery } from "@/schema-builder/types/CreateTableQuery";
import type { ForeignKeySpec } from "@/schema-builder/types/ForeignKeySpec";
import type { IndexSpec } from "@/schema-builder/types/IndexSpec";

export class PostgresCreateTableCompiler {
  constructor(private readonly columnTypeCompiler: PostgresColumnTypeCompiler) {}

  compile(query: CreateTableQuery, ctx: CompilationContext): string {
    const tableSql = ctx.utils.qualifyTable(query.table);
    const ifNotExists = query.ifNotExists ? "IF NOT EXISTS " : "";

    const parts: string[] = [];

    for (const col of query.columns) {
      parts.push(this.compileColumn(col, ctx));
    }

    if (query.primaryKey && query.primaryKey.columns.length > 0) {
      const cols = query.primaryKey.columns
        .map((c) => ctx.utils.escapeIdentifier(c))
        .join(", ");
      parts.push(`PRIMARY KEY (${cols})`);
    }

    for (const u of query.uniques) {
      parts.push(this.compileTableUnique(query.table.name, u, ctx));
    }

    for (const fk of query.foreignKeys) {
      parts.push(this.compileTableForeignKey(query.table.name, fk, ctx));
    }

    const createTable = `CREATE TABLE ${ifNotExists}${tableSql} (${parts.join(", ")})`;

    const statements: string[] = [createTable];
    for (const idx of query.indexes) {
      statements.push(this.compileIndex(query.table.name, idx, ctx));
    }

    return statements.join("; ");
  }

  private compileColumn(col: ColumnSpec, ctx: CompilationContext): string {
    const parts: string[] = [
      ctx.utils.escapeIdentifier(col.name),
      this.columnTypeCompiler.compile(col.columnType),
    ];
    if (col.notNull) parts.push("NOT NULL");
    if (col.default !== undefined) {
      parts.push(`DEFAULT ${compileDefault(col.default, ctx)}`);
    }
    if (col.primary) parts.push("PRIMARY KEY");
    if (col.unique) parts.push("UNIQUE");
    if (col.references) {
      const refTbl = ctx.utils.escapeIdentifier(col.references.table);
      const refCol = ctx.utils.escapeIdentifier(col.references.column);
      let ref = `REFERENCES ${refTbl}(${refCol})`;
      if (col.references.onDelete) {
        ref += ` ON DELETE ${compileReferentialAction(col.references.onDelete)}`;
      }
      if (col.references.onUpdate) {
        ref += ` ON UPDATE ${compileReferentialAction(col.references.onUpdate)}`;
      }
      parts.push(ref);
    }
    return parts.join(" ");
  }

  private compileTableUnique(
    tableName: string,
    spec: { name?: string; columns: string[] },
    ctx: CompilationContext,
  ): string {
    const cols = spec.columns.map((c) => ctx.utils.escapeIdentifier(c)).join(", ");
    const name = spec.name ?? `uq_${tableName}_${spec.columns.join("_")}`;
    return `CONSTRAINT ${ctx.utils.escapeIdentifier(name)} UNIQUE (${cols})`;
  }

  private compileTableForeignKey(
    tableName: string,
    spec: ForeignKeySpec,
    ctx: CompilationContext,
  ): string {
    const cols = spec.columns.map((c) => ctx.utils.escapeIdentifier(c)).join(", ");
    const refCols = spec.references.columns
      .map((c) => ctx.utils.escapeIdentifier(c))
      .join(", ");
    const refTbl = ctx.utils.escapeIdentifier(spec.references.table);
    const name = spec.name ?? `fk_${tableName}_${spec.columns.join("_")}`;
    let sql = `CONSTRAINT ${ctx.utils.escapeIdentifier(name)} FOREIGN KEY (${cols}) `
      + `REFERENCES ${refTbl}(${refCols})`;
    if (spec.onDelete) sql += ` ON DELETE ${compileReferentialAction(spec.onDelete)}`;
    if (spec.onUpdate) sql += ` ON UPDATE ${compileReferentialAction(spec.onUpdate)}`;
    return sql;
  }

  private compileIndex(tableName: string, spec: IndexSpec, ctx: CompilationContext): string {
    const cols = spec.columns.map((c) => ctx.utils.escapeIdentifier(c)).join(", ");
    const name = spec.name ?? `idx_${tableName}_${spec.columns.join("_")}`;
    const unique = spec.unique ? "UNIQUE " : "";
    const tbl = ctx.utils.escapeIdentifier(tableName);
    return `CREATE ${unique}INDEX ${ctx.utils.escapeIdentifier(name)} ON ${tbl} (${cols})`;
  }
}

export function compileDefault(d: DefaultValue, _ctx: CompilationContext): string {
  if (d.kind === "raw") return d.sql;
  return formatLiteral(d.value);
}

export function formatLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot use non-finite number as DDL default: ${String(value)}`);
    }
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  if (value instanceof Date) {
    return `'${value.toISOString()}'::timestamptz`;
  }
  throw new Error(
    `Cannot inline literal of type ${typeof value} as DDL default; use defaultRaw().`,
  );
}
