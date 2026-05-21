import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.createTable("users", (t) => {
      t.id();
      t.string("email").notNull().unique();
      t.string("name").notNull();
      t.timestamp("created_at", { withTimezone: true }).notNull().defaultRaw("NOW()");
    });

    await schema.createTable("products", (t) => {
      t.id();
      t.string("sku").notNull().unique();
      t.string("name").notNull();
      t.integer("price_cents").notNull();
      t.integer("stock").notNull().default(0);
      t.boolean("is_active").notNull().default(true);
      t.timestamp("created_at", { withTimezone: true }).notNull().defaultRaw("NOW()");
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.dropTable("products", { ifExists: true });
    await schema.dropTable("users", { ifExists: true });
  },
};

export default migration;
