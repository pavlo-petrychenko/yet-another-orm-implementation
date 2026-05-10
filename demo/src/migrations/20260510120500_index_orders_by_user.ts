import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.alterTable("orders", (t) => {
      t.addIndex(["user_id", "status"], { name: "idx_orders_user_status" });
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.alterTable("orders", (t) => {
      t.dropIndex("idx_orders_user_status");
    });
  },
};

export default migration;
