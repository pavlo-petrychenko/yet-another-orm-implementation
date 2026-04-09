import { InsertQueryBuilder } from "../InsertQueryBuilder";
import { QueryType } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";

describe("InsertQueryBuilder", () => {
  it(".into() sets the table", () => {
    const query = new InsertQueryBuilder().into({ name: "users" }).build();
    expect(query.table).toEqual({ name: "users" });
  });

  it(".values() adds a single record", () => {
    const query = new InsertQueryBuilder()
      .into({ name: "users" })
      .values({ name: "Alice", age: 30 })
      .build();
    expect(query.values).toEqual([{ name: "Alice", age: 30 }]);
  });

  it(".values() accumulates records", () => {
    const query = new InsertQueryBuilder()
      .into({ name: "users" })
      .values({ name: "Alice" })
      .values({ name: "Bob" })
      .build();
    expect(query.values).toEqual([{ name: "Alice" }, { name: "Bob" }]);
  });

  it(".valuesList() wraps a single record in an array", () => {
    const query = new InsertQueryBuilder()
      .into({ name: "users" })
      .valuesList({ name: "Alice" })
      .build();
    expect(query.values).toEqual([{ name: "Alice" }]);
  });

  it(".valuesList() adds multiple records", () => {
    const query = new InsertQueryBuilder()
      .into({ name: "users" })
      .valuesList([{ name: "A" }, { name: "B" }])
      .build();
    expect(query.values).toEqual([{ name: "A" }, { name: "B" }]);
  });

  it(".returning() with single column", () => {
    const query = new InsertQueryBuilder()
      .into({ name: "users" })
      .values({ name: "Alice" })
      .returning({ name: "id" })
      .build();
    expect(query.returning).toEqual({
      type: ClauseType.Returning,
      columns: [{ name: "id" }],
    });
  });

  it(".returning() with multiple columns", () => {
    const query = new InsertQueryBuilder()
      .into({ name: "users" })
      .values({ name: "Alice" })
      .returning({ name: "id" }, { name: "created_at" })
      .build();
    expect(query.returning).toEqual({
      type: ClauseType.Returning,
      columns: [{ name: "id" }, { name: "created_at" }],
    });
  });

  it("full chain builds a complete InsertQuery", () => {
    const query = new InsertQueryBuilder()
      .into({ name: "users" })
      .valuesList({ name: "Alice", age: 30 })
      .returning({ name: "id" })
      .build();
    expect(query).toEqual({
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [{ name: "Alice", age: 30 }],
      returning: {
        type: ClauseType.Returning,
        columns: [{ name: "id" }],
      },
    });
  });

  it("empty values produces values: []", () => {
    const query = new InsertQueryBuilder().into({ name: "users" }).build();
    expect(query.type).toBe(QueryType.INSERT);
    expect(query.values).toEqual([]);
  });

  it("all methods return this for chaining", () => {
    const builder = new InsertQueryBuilder();
    expect(builder.into({ name: "users" })).toBe(builder);
    expect(builder.values({ a: 1 })).toBe(builder);
    expect(builder.valuesList({ b: 2 })).toBe(builder);
    expect(builder.returning({ name: "id" })).toBe(builder);
  });
});
