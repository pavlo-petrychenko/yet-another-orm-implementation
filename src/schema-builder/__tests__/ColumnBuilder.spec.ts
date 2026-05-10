import { ColumnBuilder } from "@/schema-builder/builders/ColumnBuilder";

describe("ColumnBuilder", () => {
  it("captures name and type", () => {
    const spec = new ColumnBuilder("email", { kind: "varchar", length: 255 }).build();
    expect(spec.name).toBe("email");
    expect(spec.columnType).toEqual({ kind: "varchar", length: 255 });
    expect(spec.notNull).toBe(false);
    expect(spec.primary).toBe(false);
    expect(spec.unique).toBe(false);
  });

  it("chains modifiers", () => {
    const spec = new ColumnBuilder("email", { kind: "text" })
      .notNull()
      .unique()
      .build();
    expect(spec.notNull).toBe(true);
    expect(spec.unique).toBe(true);
  });

  it("default literal becomes value DefaultValue", () => {
    const spec = new ColumnBuilder("score", { kind: "integer" }).default(0).build();
    expect(spec.default).toEqual({ kind: "value", value: 0 });
  });

  it("defaultRaw becomes raw DefaultValue", () => {
    const spec = new ColumnBuilder("created_at", { kind: "timestamp" })
      .defaultRaw("NOW()")
      .build();
    expect(spec.default).toEqual({ kind: "raw", sql: "NOW()" });
  });

  it("references defaults to id column", () => {
    const spec = new ColumnBuilder("user_id", { kind: "integer" })
      .references("users")
      .build();
    expect(spec.references).toEqual({ table: "users", column: "id" });
  });

  it("references with explicit column + onDelete", () => {
    const spec = new ColumnBuilder("user_id", { kind: "integer" })
      .references("users", "uid")
      .onDelete("cascade")
      .build();
    expect(spec.references).toEqual({
      table: "users",
      column: "uid",
      onDelete: "cascade",
    });
  });

  it("nullable resets notNull", () => {
    const spec = new ColumnBuilder("bio", { kind: "text" }).notNull().nullable().build();
    expect(spec.notNull).toBe(false);
  });
});
