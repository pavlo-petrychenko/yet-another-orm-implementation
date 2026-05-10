import { setupSchemaBuilder } from "./helpers";

describe("SchemaBuilder.alterTable (integration)", () => {
  const fx = setupSchemaBuilder();

  beforeEach(async () => {
    await fx.dropTables("sb_alter_orgs", "sb_alter_users");
    await fx.getSchema().createTable("sb_alter_users", (t) => {
      t.id();
      t.text("email").notNull().unique();
      t.text("display_name").notNull();
      t.integer("score").nullable();
    });
    await fx.getSchema().createTable("sb_alter_orgs", (t) => {
      t.id();
      t.text("name").notNull();
    });
  });

  it("addColumn lands and is queryable", async () => {
    const schema = fx.getSchema();
    await schema.alterTable("sb_alter_users", (t) => {
      t.addColumn("nickname", { kind: "varchar", length: 50 });
    });
    await fx.rawQuery(
      'INSERT INTO "sb_alter_users" ("email", "display_name", "nickname") '
        + "VALUES ($1, $2, $3)",
      ["a@b.co", "A", "Al"],
    );
    const rows = await fx.rawQuery<{ nickname: string }>(
      'SELECT nickname FROM "sb_alter_users"',
    );
    expect(rows[0].nickname).toBe("Al");
  });

  it("dropColumn removes a column", async () => {
    const schema = fx.getSchema();
    await schema.alterTable("sb_alter_users", (t) => {
      t.dropColumn("score");
    });
    const cols = await fx.rawQuery<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns "
        + "WHERE table_name = $1 AND table_schema = current_schema()",
      ["sb_alter_users"],
    );
    expect(cols.find((c) => c.column_name === "score")).toBeUndefined();
  });

  it("renameColumn", async () => {
    const schema = fx.getSchema();
    await schema.alterTable("sb_alter_users", (t) => {
      t.renameColumn("display_name", "full_name");
    });
    await fx.rawQuery(
      'INSERT INTO "sb_alter_users" ("email", "full_name") VALUES ($1, $2)',
      ["a@b.co", "Alice"],
    );
    const rows = await fx.rawQuery<{ full_name: string }>(
      'SELECT full_name FROM "sb_alter_users"',
    );
    expect(rows[0].full_name).toBe("Alice");
  });

  it("alterColumn: setNotNull(true) + setDefault(value)", async () => {
    const schema = fx.getSchema();
    await schema.alterTable("sb_alter_users", (t) => {
      t.alterColumn("score", (c) => c.setNotNull(true).setDefault(0));
    });
    await fx.rawQuery(
      'INSERT INTO "sb_alter_users" ("email", "display_name") VALUES ($1, $2)',
      ["x@y.co", "X"],
    );
    const rows = await fx.rawQuery<{ score: number }>(
      'SELECT score FROM "sb_alter_users"',
    );
    expect(rows[0].score).toBe(0);
  });

  it("addForeignKey + dropConstraint", async () => {
    const schema = fx.getSchema();
    await schema.alterTable("sb_alter_users", (t) => {
      t.addColumn("org_id", { kind: "integer" });
      t.addForeignKey({
        columns: ["org_id"],
        references: { table: "sb_alter_orgs", columns: ["id"] },
        name: "fk_users_org",
        onDelete: "set null",
      });
    });
    const org = await fx.rawQuery<{ id: number }>(
      'INSERT INTO "sb_alter_orgs" ("name") VALUES ($1) RETURNING id',
      ["acme"],
    );
    await fx.rawQuery(
      'INSERT INTO "sb_alter_users" ("email", "display_name", "org_id") '
        + "VALUES ($1, $2, $3)",
      ["a@b.co", "A", org[0].id],
    );
    await fx.rawQuery('DELETE FROM "sb_alter_orgs"');
    const rows = await fx.rawQuery<{ org_id: number | null }>(
      'SELECT org_id FROM "sb_alter_users"',
    );
    expect(rows[0].org_id).toBeNull();

    await schema.alterTable("sb_alter_users", (t) => {
      t.dropConstraint("fk_users_org");
    });
  });

  it("multi-clause ALTER TABLE atomic: one bad clause rolls back the whole batch", async () => {
    const schema = fx.getSchema();
    await expect(
      schema.alterTable("sb_alter_users", (t) => {
        t.addColumn("nickname", { kind: "varchar", length: 50 });
        t.dropColumn("nonexistent_column");
      }),
    ).rejects.toThrow();
    const cols = await fx.rawQuery<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns "
        + "WHERE table_name = $1 AND table_schema = current_schema()",
      ["sb_alter_users"],
    );
    expect(cols.find((c) => c.column_name === "nickname")).toBeUndefined();
  });

  it("addIndex + dropIndex", async () => {
    const schema = fx.getSchema();
    await schema.alterTable("sb_alter_users", (t) => {
      t.addIndex(["display_name"], { name: "idx_alter_disp" });
    });
    const idx = await fx.rawQuery<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE tablename = $1",
      ["sb_alter_users"],
    );
    expect(idx.find((i) => i.indexname === "idx_alter_disp")).toBeDefined();

    await schema.alterTable("sb_alter_users", (t) => {
      t.dropIndex("idx_alter_disp");
    });
    const idx2 = await fx.rawQuery<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE tablename = $1",
      ["sb_alter_users"],
    );
    expect(idx2.find((i) => i.indexname === "idx_alter_disp")).toBeUndefined();
  });
});
