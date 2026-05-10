import type { Migration, SchemaBuilder } from "@iriskaik/yaoi";

const migration: Migration = {
  async up(schema: SchemaBuilder): Promise<void> {
    await schema.createTable("users", (t) => {
      t.id();
      t.text("email").notNull().unique();
      t.text("name").notNull();
      t.timestamps();
    });
  },

  async down(schema: SchemaBuilder): Promise<void> {
    await schema.dropTable("users", { ifExists: true });
  },
};

export default migration;
