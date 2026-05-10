import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.createTable("tags", (t) => {
      t.id();
      t.text("name").notNull().unique();
    });

    await schema.createTable("product_tags", (t) => {
      t.integer("product_id")
        .notNull()
        .references("products")
        .onDelete("cascade");
      t.integer("tag_id")
        .notNull()
        .references("tags")
        .onDelete("cascade");
      t.primary(["product_id", "tag_id"]);
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.dropTable("product_tags", { ifExists: true });
    await schema.dropTable("tags", { ifExists: true });
  },
};

export default migration;
