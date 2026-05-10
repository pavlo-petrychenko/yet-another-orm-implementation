import { setupSchemaBuilder } from "./helpers";

describe("SchemaBuilder.createTable (integration)", () => {
  const fx = setupSchemaBuilder();

  beforeEach(async () => {
    await fx.dropTables("sb_profiles", "sb_users", "sb_post_tags", "sb_posts", "sb_tags");
  });

  it("creates a table with column types, defaults, primary key and unique", async () => {
    const schema = fx.getSchema();
    await schema.createTable("sb_users", (t) => {
      t.id();
      t.string("email", 255).notNull().unique();
      t.text("display_name").notNull();
      t.boolean("is_active").notNull().default(true);
      t.timestamp("created_at", { withTimezone: true }).notNull().defaultRaw("NOW()");
    });

    const has = await schema.hasTable("sb_users");
    expect(has).toBe(true);

    await fx.rawQuery(
      'INSERT INTO "sb_users" ("email", "display_name") VALUES ($1, $2)',
      ["a@b.co", "A B"],
    );
    const rows = await fx.rawQuery<{ id: number; is_active: boolean }>(
      'SELECT id, is_active FROM "sb_users"',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].is_active).toBe(true);

    await expect(
      fx.rawQuery(
        'INSERT INTO "sb_users" ("email", "display_name") VALUES ($1, $2)',
        ["a@b.co", "dup"],
      ),
    ).rejects.toThrow();
  });

  it("creates a table with inline FK and ON DELETE CASCADE", async () => {
    const schema = fx.getSchema();
    await schema.createTable("sb_users", (t) => {
      t.id();
      t.text("email").notNull().unique();
    });
    await schema.createTable("sb_profiles", (t) => {
      t.id();
      t.integer("user_id").notNull().unique().references("sb_users").onDelete("cascade");
      t.text("bio").nullable();
    });

    const u = await fx.rawQuery<{ id: number }>(
      'INSERT INTO "sb_users" ("email") VALUES ($1) RETURNING id',
      ["a@b.co"],
    );
    await fx.rawQuery(
      'INSERT INTO "sb_profiles" ("user_id", "bio") VALUES ($1, $2)',
      [u[0].id, "hi"],
    );

    await fx.rawQuery('DELETE FROM "sb_users" WHERE id = $1', [u[0].id]);
    const remaining = await fx.rawQuery('SELECT * FROM "sb_profiles"');
    expect(remaining).toHaveLength(0);
  });

  it("creates a table with composite primary key", async () => {
    const schema = fx.getSchema();
    await schema.createTable("sb_posts", (t) => {
      t.id();
      t.text("title").notNull();
    });
    await schema.createTable("sb_tags", (t) => {
      t.id();
      t.text("name").notNull().unique();
    });
    await schema.createTable("sb_post_tags", (t) => {
      t.integer("post_id").notNull();
      t.integer("tag_id").notNull();
      t.primary(["post_id", "tag_id"]);
      t.foreign("post_id").references("sb_posts").onDelete("cascade");
      t.foreign("tag_id").references("sb_tags").onDelete("cascade");
    });

    const p = await fx.rawQuery<{ id: number }>(
      'INSERT INTO "sb_posts" ("title") VALUES ($1) RETURNING id',
      ["hello"],
    );
    const tg = await fx.rawQuery<{ id: number }>(
      'INSERT INTO "sb_tags" ("name") VALUES ($1) RETURNING id',
      ["meta"],
    );
    await fx.rawQuery(
      'INSERT INTO "sb_post_tags" ("post_id", "tag_id") VALUES ($1, $2)',
      [p[0].id, tg[0].id],
    );
    await expect(
      fx.rawQuery(
        'INSERT INTO "sb_post_tags" ("post_id", "tag_id") VALUES ($1, $2)',
        [p[0].id, tg[0].id],
      ),
    ).rejects.toThrow();
  });

  it("ifNotExists() makes repeated calls idempotent", async () => {
    const schema = fx.getSchema();
    await schema.createTable("sb_users", (t) => {
      t.id();
      t.ifNotExists();
    });
    await expect(
      schema.createTable("sb_users", (t) => {
        t.id();
        t.ifNotExists();
      }),
    ).resolves.toBeUndefined();
  });
});
