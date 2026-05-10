import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.createTable("orders", (t) => {
      t.id();
      t.integer("user_id")
        .notNull()
        .references("users")
        .onDelete("restrict");
      t.text("status").notNull().default("pending");
      t.decimal("total", 12, 2).notNull().default("0");
      t.timestamp("placed_at", { withTimezone: true })
        .notNull()
        .defaultRaw("NOW()");
    });

    await schema.createTable("order_items", (t) => {
      t.id();
      t.integer("order_id")
        .notNull()
        .references("orders")
        .onDelete("cascade");
      t.integer("product_id")
        .notNull()
        .references("products")
        .onDelete("restrict");
      t.integer("quantity").notNull();
      t.decimal("unit_price", 10, 2).notNull();
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.dropTable("order_items", { ifExists: true });
    await schema.dropTable("orders", { ifExists: true });
  },
};

export default migration;
