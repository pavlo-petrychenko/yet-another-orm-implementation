import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.alterTable("products", (t) => {
      t.addColumn("stock_count", { kind: "integer" }).notNull().default(0);
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.alterTable("products", (t) => {
      t.dropColumn("stock_count");
    });
  },
};

export default migration;
