import { PostgresColumnTypeCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresColumnTypeCompiler";
import { PostgresCreateTableCompiler } from "@/drivers/postgres/dialect/compilers/ddl/PostgresCreateTableCompiler";
import type { CreateTableQuery } from "@/schema-builder/types/CreateTableQuery";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";
import { createDdlCtx } from "./helpers";

const compiler = new PostgresCreateTableCompiler(new PostgresColumnTypeCompiler());

describe("PostgresCreateTableCompiler", () => {
  it("emits a minimal CREATE TABLE", () => {
    const { ctx, params } = createDdlCtx();
    const q: CreateTableQuery = {
      type: DdlQueryType.CREATE_TABLE,
      table: { name: "users" },
      ifNotExists: false,
      columns: [
        {
          name: "id",
          columnType: { kind: "serial" },
          notNull: true,
          primary: true,
          unique: false,
        },
      ],
      uniques: [],
      indexes: [],
      foreignKeys: [],
    };
    const sql = compiler.compile(q, ctx);
    expect(sql).toBe('CREATE TABLE "users" ("id" SERIAL NOT NULL PRIMARY KEY)');
    expect(params.getParams()).toEqual([]);
  });

  it("emits IF NOT EXISTS, default values (literal + raw), references, indexes", () => {
    const { ctx, params } = createDdlCtx();
    const q: CreateTableQuery = {
      type: DdlQueryType.CREATE_TABLE,
      table: { name: "users" },
      ifNotExists: true,
      columns: [
        {
          name: "id",
          columnType: { kind: "serial" },
          notNull: true,
          primary: true,
          unique: false,
        },
        {
          name: "email",
          columnType: { kind: "text" },
          notNull: true,
          primary: false,
          unique: true,
        },
        {
          name: "is_active",
          columnType: { kind: "boolean" },
          notNull: true,
          primary: false,
          unique: false,
          default: { kind: "value", value: true },
        },
        {
          name: "created_at",
          columnType: { kind: "timestamp", withTimezone: true },
          notNull: true,
          primary: false,
          unique: false,
          default: { kind: "raw", sql: "NOW()" },
        },
      ],
      uniques: [],
      indexes: [{ name: "idx_users_email", columns: ["email"], unique: false }],
      foreignKeys: [],
    };
    const sql = compiler.compile(q, ctx);
    expect(sql).toBe(
      'CREATE TABLE IF NOT EXISTS "users" ('
        + '"id" SERIAL NOT NULL PRIMARY KEY, '
        + '"email" TEXT NOT NULL UNIQUE, '
        + '"is_active" BOOLEAN NOT NULL DEFAULT TRUE, '
        + '"created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()'
        + '); '
        + 'CREATE INDEX "idx_users_email" ON "users" ("email")',
    );
    expect(params.getParams()).toEqual([]);
  });

  it("emits composite primary key + table-level FK with auto-derived name", () => {
    const { ctx } = createDdlCtx();
    const q: CreateTableQuery = {
      type: DdlQueryType.CREATE_TABLE,
      table: { name: "post_tags" },
      ifNotExists: false,
      columns: [
        {
          name: "post_id",
          columnType: { kind: "integer" },
          notNull: true,
          primary: false,
          unique: false,
        },
        {
          name: "tag_id",
          columnType: { kind: "integer" },
          notNull: true,
          primary: false,
          unique: false,
        },
      ],
      primaryKey: { columns: ["post_id", "tag_id"] },
      uniques: [],
      indexes: [],
      foreignKeys: [
        {
          columns: ["post_id"],
          references: { table: "posts", columns: ["id"] },
          onDelete: "cascade",
        },
      ],
    };
    const sql = compiler.compile(q, ctx);
    expect(sql).toBe(
      'CREATE TABLE "post_tags" ('
        + '"post_id" INTEGER NOT NULL, '
        + '"tag_id" INTEGER NOT NULL, '
        + 'PRIMARY KEY ("post_id", "tag_id"), '
        + 'CONSTRAINT "fk_post_tags_post_id" FOREIGN KEY ("post_id") '
        + 'REFERENCES "posts"("id") ON DELETE CASCADE'
        + ')',
    );
  });

  it("emits inline column REFERENCES with ON DELETE", () => {
    const { ctx } = createDdlCtx();
    const q: CreateTableQuery = {
      type: DdlQueryType.CREATE_TABLE,
      table: { name: "profiles" },
      ifNotExists: false,
      columns: [
        {
          name: "user_id",
          columnType: { kind: "integer" },
          notNull: true,
          primary: false,
          unique: true,
          references: { table: "users", column: "id", onDelete: "cascade" },
        },
      ],
      uniques: [],
      indexes: [],
      foreignKeys: [],
    };
    const sql = compiler.compile(q, ctx);
    expect(sql).toBe(
      'CREATE TABLE "profiles" ('
        + '"user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE'
        + ')',
    );
  });

  it("emits unique INDEX", () => {
    const { ctx } = createDdlCtx();
    const q: CreateTableQuery = {
      type: DdlQueryType.CREATE_TABLE,
      table: { name: "things" },
      ifNotExists: false,
      columns: [
        {
          name: "id",
          columnType: { kind: "serial" },
          notNull: true,
          primary: true,
          unique: false,
        },
      ],
      uniques: [],
      indexes: [{ columns: ["id"], unique: true }],
      foreignKeys: [],
    };
    const sql = compiler.compile(q, ctx);
    expect(sql).toContain('CREATE UNIQUE INDEX "idx_things_id" ON "things" ("id")');
  });
});
