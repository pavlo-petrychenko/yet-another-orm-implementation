import { setupSchemaBuilder } from "./helpers";

describe("SchemaBuilder.dropTable / renameTable (integration)", () => {
  const fx = setupSchemaBuilder();

  beforeEach(async () => {
    await fx.dropTables("sb_dr_kids", "sb_dr_parents", "sb_dr_a", "sb_dr_b");
  });

  it("dropTable IF EXISTS no-ops on a missing table", async () => {
    const schema = fx.getSchema();
    await expect(
      schema.dropTable("sb_dr_missing", { ifExists: true }),
    ).resolves.toBeUndefined();
  });

  it("dropTable CASCADE cascades to dependent tables", async () => {
    const schema = fx.getSchema();
    await schema.createTable("sb_dr_parents", (t) => {
      t.id();
      t.text("name").notNull();
    });
    await schema.createTable("sb_dr_kids", (t) => {
      t.id();
      t.integer("parent_id").notNull().references("sb_dr_parents");
    });
    await schema.dropTable("sb_dr_parents", { cascade: true });
    expect(await schema.hasTable("sb_dr_parents")).toBe(false);
    // cascade drops the FK constraint from sb_dr_kids; the table itself remains
    expect(await schema.hasTable("sb_dr_kids")).toBe(true);
  });

  it("renameTable", async () => {
    const schema = fx.getSchema();
    await schema.createTable("sb_dr_a", (t) => {
      t.id();
    });
    await schema.renameTable("sb_dr_a", "sb_dr_b");
    expect(await schema.hasTable("sb_dr_a")).toBe(false);
    expect(await schema.hasTable("sb_dr_b")).toBe(true);
  });
});
