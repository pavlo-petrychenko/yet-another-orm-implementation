import { PostgresAlterTableCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresAlterTableCompiler";
import { PostgresColumnTypeCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresColumnTypeCompiler";
import type { AlterTableQuery } from "@/schema-builder/types/AlterTableQuery";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";
import { createDdlCtx } from "./helpers";

const compiler = new PostgresAlterTableCompiler(new PostgresColumnTypeCompiler());

describe("PostgresAlterTableCompiler", () => {
  it("folds combinable clauses into one ALTER TABLE", () => {
    const { ctx } = createDdlCtx();
    const q: AlterTableQuery = {
      type: DdlQueryType.ALTER_TABLE,
      table: { name: "users" },
      operations: [
        {
          kind: "addColumn",
          spec: {
            name: "nickname",
            columnType: { kind: "varchar", length: 50 },
            notNull: false,
            primary: false,
            unique: false,
          },
        },
        { kind: "dropColumn", name: "legacy", ifExists: true },
      ],
    };
    expect(compiler.compile(q, ctx)).toBe(
      'ALTER TABLE "users" ADD COLUMN "nickname" VARCHAR(50), DROP COLUMN IF EXISTS "legacy"',
    );
  });

  it("emits RENAME COLUMN as standalone statement", () => {
    const { ctx } = createDdlCtx();
    const q: AlterTableQuery = {
      type: DdlQueryType.ALTER_TABLE,
      table: { name: "users" },
      operations: [
        { kind: "renameColumn", from: "display_name", to: "fullName" },
      ],
    };
    expect(compiler.compile(q, ctx)).toBe(
      'ALTER TABLE "users" RENAME COLUMN "display_name" TO "fullName"',
    );
  });

  it("preserves intent: ALTER, RENAME, ALTER produce three statements", () => {
    const { ctx } = createDdlCtx();
    const q: AlterTableQuery = {
      type: DdlQueryType.ALTER_TABLE,
      table: { name: "users" },
      operations: [
        {
          kind: "addColumn",
          spec: {
            name: "a",
            columnType: { kind: "text" },
            notNull: false,
            primary: false,
            unique: false,
          },
        },
        { kind: "renameColumn", from: "x", to: "y" },
        { kind: "dropColumn", name: "b", ifExists: false },
      ],
    };
    expect(compiler.compile(q, ctx)).toBe(
      'ALTER TABLE "users" ADD COLUMN "a" TEXT; '
        + 'ALTER TABLE "users" RENAME COLUMN "x" TO "y"; '
        + 'ALTER TABLE "users" DROP COLUMN "b"',
    );
  });

  it("addIndex/dropIndex are emitted as separate statements", () => {
    const { ctx } = createDdlCtx();
    const q: AlterTableQuery = {
      type: DdlQueryType.ALTER_TABLE,
      table: { name: "users" },
      operations: [
        { kind: "addIndex", spec: { columns: ["email"], unique: false } },
        { kind: "dropIndex", name: "idx_users_old" },
      ],
    };
    expect(compiler.compile(q, ctx)).toBe(
      'CREATE INDEX "idx_users_email" ON "users" ("email"); DROP INDEX "idx_users_old"',
    );
  });

  it("alterColumn emits SET NOT NULL / SET DEFAULT / DROP DEFAULT / TYPE", () => {
    const { ctx, params } = createDdlCtx();
    const q: AlterTableQuery = {
      type: DdlQueryType.ALTER_TABLE,
      table: { name: "users" },
      operations: [
        {
          kind: "alterColumn",
          name: "email",
          changes: {
            setType: { kind: "varchar", length: 255 },
            setNotNull: true,
            setDefault: { kind: "value", value: "anon" },
          },
        },
        {
          kind: "alterColumn",
          name: "score",
          changes: { setNotNull: false, setDefault: null },
        },
      ],
    };
    expect(compiler.compile(q, ctx)).toBe(
      'ALTER TABLE "users" '
        + 'ALTER COLUMN "email" TYPE VARCHAR(255), '
        + 'ALTER COLUMN "email" SET NOT NULL, '
        + 'ALTER COLUMN "email" SET DEFAULT \'anon\', '
        + 'ALTER COLUMN "score" DROP NOT NULL, '
        + 'ALTER COLUMN "score" DROP DEFAULT',
    );
    expect(params.getParams()).toEqual([]);
  });

  it("addForeignKey + dropConstraint", () => {
    const { ctx } = createDdlCtx();
    const q: AlterTableQuery = {
      type: DdlQueryType.ALTER_TABLE,
      table: { name: "users" },
      operations: [
        {
          kind: "addForeignKey",
          spec: {
            columns: ["org_id"],
            references: { table: "orgs", columns: ["id"] },
            onDelete: "set null",
            name: "fk_users_org",
          },
        },
        { kind: "dropConstraint", name: "fk_old" },
      ],
    };
    expect(compiler.compile(q, ctx)).toBe(
      'ALTER TABLE "users" '
        + 'ADD CONSTRAINT "fk_users_org" FOREIGN KEY ("org_id") '
        + 'REFERENCES "orgs"("id") ON DELETE SET NULL, '
        + 'DROP CONSTRAINT "fk_old"',
    );
  });
});
