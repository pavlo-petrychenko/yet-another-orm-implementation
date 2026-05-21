import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.createTable("orders", (t) => {
      t.id();
      t.integer("user_id").notNull().references("users", "id").onDelete("restrict");
      t.string("status").notNull().default("pending");
      t.integer("total_cents").notNull();
      t.timestamp("created_at", { withTimezone: true }).notNull().defaultRaw("NOW()");
    });

    await schema.createTable("order_items", (t) => {
      t.id();
      t.integer("order_id").notNull().references("orders", "id").onDelete("cascade");
      t.integer("product_id").notNull().references("products", "id").onDelete("restrict");
      t.integer("quantity").notNull();
      t.integer("price_at_purchase_cents").notNull();
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.dropTable("order_items", { ifExists: true });
    await schema.dropTable("orders", { ifExists: true });
  },
};

export default migration;
