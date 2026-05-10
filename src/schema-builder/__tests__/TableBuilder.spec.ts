import { TableBuilder } from "@/schema-builder/builders/TableBuilder";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";

describe("TableBuilder", () => {
  it("produces a CreateTableQuery with the expected shape", () => {
    const tb = new TableBuilder("users");
    tb.id();
    tb.string("email", 255).notNull().unique();
    tb.text("bio");
    tb.boolean("is_active").notNull().default(true);
    tb.timestamp("created_at", { withTimezone: true }).notNull().defaultRaw("NOW()");

    const q = tb.build();
    expect(q.type).toBe(DdlQueryType.CREATE_TABLE);
    expect(q.table).toEqual({ name: "users" });
    expect(q.ifNotExists).toBe(false);
    expect(q.columns).toHaveLength(5);
    expect(q.columns[0]).toEqual({
      name: "id",
      columnType: { kind: "serial" },
      notNull: true,
      primary: true,
      unique: false,
    });
    expect(q.columns[1].columnType).toEqual({ kind: "varchar", length: 255 });
    expect(q.columns[1].unique).toBe(true);
    expect(q.columns[3].default).toEqual({ kind: "value", value: true });
    expect(q.columns[4].default).toEqual({ kind: "raw", sql: "NOW()" });
  });

  it("supports composite primary key", () => {
    const tb = new TableBuilder("post_tags");
    tb.integer("post_id").notNull();
    tb.integer("tag_id").notNull();
    tb.primary(["post_id", "tag_id"]);
    const q = tb.build();
    expect(q.primaryKey).toEqual({ columns: ["post_id", "tag_id"] });
  });

  it("ifNotExists toggles", () => {
    const tb = new TableBuilder("users").ifNotExists();
    expect(tb.build().ifNotExists).toBe(true);
  });

  it("table-level unique + index", () => {
    const tb = new TableBuilder("users");
    tb.string("email");
    tb.unique(["email"], { name: "uq_email" });
    tb.index(["email"], { unique: false, name: "idx_email" });
    const q = tb.build();
    expect(q.uniques).toEqual([{ name: "uq_email", columns: ["email"] }]);
    expect(q.indexes).toEqual([{ name: "idx_email", columns: ["email"], unique: false }]);
  });

  it("foreign() registers FK on .references()", () => {
    const tb = new TableBuilder("orders");
    tb.integer("user_id").notNull();
    tb.foreign("user_id").references("users").onDelete("cascade");
    const q = tb.build();
    expect(q.foreignKeys).toHaveLength(1);
    expect(q.foreignKeys[0]).toMatchObject({
      columns: ["user_id"],
      references: { table: "users", columns: ["id"] },
      onDelete: "cascade",
    });
  });

  it("timestamps() sugar adds created_at + updated_at with NOW() default", () => {
    const tb = new TableBuilder("things");
    tb.id();
    tb.timestamps();
    const q = tb.build();
    const created = q.columns.find((c) => c.name === "created_at");
    const updated = q.columns.find((c) => c.name === "updated_at");
    expect(created?.default).toEqual({ kind: "raw", sql: "NOW()" });
    expect(updated?.default).toEqual({ kind: "raw", sql: "NOW()" });
    expect(created?.notNull).toBe(true);
  });
});
