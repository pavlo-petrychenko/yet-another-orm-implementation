import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.raw(
      "CREATE INDEX IF NOT EXISTS orders_user_status_idx ON orders (user_id, status)",
    );
    await schema.raw(
      "CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id)",
    );
    await schema.raw(
      "CREATE INDEX IF NOT EXISTS products_is_active_idx ON products (is_active) WHERE is_active = TRUE",
    );
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.raw("DROP INDEX IF EXISTS products_is_active_idx");
    await schema.raw("DROP INDEX IF EXISTS order_items_order_id_idx");
    await schema.raw("DROP INDEX IF EXISTS orders_user_status_idx");
  },
};

export default migration;
