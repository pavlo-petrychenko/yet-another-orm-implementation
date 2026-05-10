import type { CompilationContext } from "@/drivers/common/CompilationContext";
import { compileDefault } from "@/drivers/postgres/dialect/compilers/ddl/PostgresCreateTableCompiler";
import type { PostgresColumnTypeCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresColumnTypeCompiler";
import { compileReferentialAction } from "@/drivers/postgres/dialect/compilers/ddl/referentialAction";
import type {
  AlterColumnChanges,
  AlterOperation,
  AlterTableQuery,
} from "@/schema-builder/types/AlterTableQuery";
import type { ColumnSpec } from "@/schema-builder/types/ColumnSpec";
import type { ForeignKeySpec } from "@/schema-builder/types/ForeignKeySpec";
import type { IndexSpec } from "@/schema-builder/types/IndexSpec";

interface Segment {
  kind: "alter" | "standalone";
  sql: string;
}

export class PostgresAlterTableCompiler {
  constructor(private readonly columnTypeCompiler: PostgresColumnTypeCompiler) {}

  compile(query: AlterTableQuery, ctx: CompilationContext): string {
    const tableName = query.table.name;
    const tableSql = ctx.utils.qualifyTable(query.table);

    const segments: Segment[] = [];
    for (const op of query.operations) {
      const sql = this.compileOperation(tableName, op, ctx);
      segments.push({ kind: this.segmentKind(op), sql });
    }

    const statements: string[] = [];
    let pendingClauses: string[] = [];
    const flush = (): void => {
      if (pendingClauses.length > 0) {
        statements.push(`ALTER TABLE ${tableSql} ${pendingClauses.join(", ")}`);
        pendingClauses = [];
      }
    };

    for (const seg of segments) {
      if (seg.kind === "alter") {
        pendingClauses.push(seg.sql);
      } else {
        flush();
        statements.push(seg.sql);
      }
    }
    flush();

    return statements.join("; ");
  }

  private segmentKind(op: AlterOperation): "alter" | "standalone" {
    if (op.kind === "renameColumn") return "standalone";
    if (op.kind === "addIndex") return "standalone";
    if (op.kind === "dropIndex") return "standalone";
    return "alter";
  }

  private compileOperation(
    tableName: string,
    op: AlterOperation,
    ctx: CompilationContext,
  ): string {
    switch (op.kind) {
      case "addColumn":
        return `ADD COLUMN ${this.compileColumnDefinition(op.spec, ctx)}`;
      case "dropColumn": {
        const ifExists = op.ifExists ? "IF EXISTS " : "";
        return `DROP COLUMN ${ifExists}${ctx.utils.escapeIdentifier(op.name)}`;
      }
      case "alterColumn":
        return this.compileAlterColumn(op.name, op.changes, ctx);
      case "addForeignKey":
        return `ADD ${this.compileForeignKey(tableName, op.spec, ctx)}`;
      case "dropConstraint":
        return `DROP CONSTRAINT ${ctx.utils.escapeIdentifier(op.name)}`;
      case "renameColumn": {
        const tableSql = ctx.utils.qualifyTable({ name: tableName });
        return `ALTER TABLE ${tableSql} RENAME COLUMN `
          + `${ctx.utils.escapeIdentifier(op.from)} TO ${ctx.utils.escapeIdentifier(op.to)}`;
      }
      case "addIndex":
        return this.compileCreateIndex(tableName, op.spec, ctx);
      case "dropIndex":
        return `DROP INDEX ${ctx.utils.escapeIdentifier(op.name)}`;
    }
  }

  private compileColumnDefinition(col: ColumnSpec, ctx: CompilationContext): string {
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

  private compileAlterColumn(
    name: string,
    changes: AlterColumnChanges,
    ctx: CompilationContext,
  ): string {
    const colId = ctx.utils.escapeIdentifier(name);
    const subClauses: string[] = [];
    if (changes.setType) {
      subClauses.push(
        `ALTER COLUMN ${colId} TYPE ${this.columnTypeCompiler.compile(changes.setType)}`,
      );
    }
    if (changes.setNotNull === true) {
      subClauses.push(`ALTER COLUMN ${colId} SET NOT NULL`);
    } else if (changes.setNotNull === false) {
      subClauses.push(`ALTER COLUMN ${colId} DROP NOT NULL`);
    }
    if (changes.setDefault === null) {
      subClauses.push(`ALTER COLUMN ${colId} DROP DEFAULT`);
    } else if (changes.setDefault !== undefined) {
      subClauses.push(
        `ALTER COLUMN ${colId} SET DEFAULT ${compileDefault(changes.setDefault, ctx)}`,
      );
    }
    return subClauses.join(", ");
  }

  private compileForeignKey(
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

  private compileCreateIndex(
    tableName: string,
    spec: IndexSpec,
    ctx: CompilationContext,
  ): string {
    const cols = spec.columns.map((c) => ctx.utils.escapeIdentifier(c)).join(", ");
    const name = spec.name ?? `idx_${tableName}_${spec.columns.join("_")}`;
    const unique = spec.unique ? "UNIQUE " : "";
    const tbl = ctx.utils.escapeIdentifier(tableName);
    return `CREATE ${unique}INDEX ${ctx.utils.escapeIdentifier(name)} ON ${tbl} (${cols})`;
  }
}
