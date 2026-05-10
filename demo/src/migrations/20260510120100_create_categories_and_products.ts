import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.createTable("categories", (t) => {
      t.id();
      t.text("name").notNull().unique();
      t.text("slug").notNull().unique();
    });

    await schema.createTable("products", (t) => {
      t.id();
      t.text("sku").notNull().unique();
      t.text("name").notNull();
      t.decimal("price", 10, 2).notNull();
      t.integer("category_id")
        .notNull()
        .references("categories")
        .onDelete("restrict");
      t.timestamps();
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.dropTable("products", { ifExists: true });
    await schema.dropTable("categories", { ifExists: true });
  },
};

export default migration;
