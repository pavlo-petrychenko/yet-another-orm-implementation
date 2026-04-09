import { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
import { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
import { InsertQueryBuilder } from "@/query-builder/builders/InsertQueryBuilder";
import { UpdateQueryBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
import { DeleteQueryBuilder } from "@/query-builder/builders/DeleteQueryBuilder";

const table = { name: "users" };

describe("QueryBuilder", () => {
  let qb: QueryBuilder;

  beforeEach(() => {
    qb = new QueryBuilder();
  });

  it(".select(table) returns instance of SelectQueryBuilder", () => {
    const builder = qb.select(table);
    expect(builder).toBeInstanceOf(SelectQueryBuilder);
  });

  it(".select(table, ...columns) returns SelectQueryBuilder with columns pre-set", () => {
    const builder = qb.select(table, { name: "id" }, { name: "name" });
    expect(builder).toBeInstanceOf(SelectQueryBuilder);
    const query = builder.build();
    expect(query.columns).toEqual([
      { name: "id" },
      { name: "name" },
    ]);
  });

  it(".insert(table) returns instance of InsertQueryBuilder", () => {
    const builder = qb.insert(table);
    expect(builder).toBeInstanceOf(InsertQueryBuilder);
  });

  it(".update(table) returns instance of UpdateQueryBuilder", () => {
    const builder = qb.update(table);
    expect(builder).toBeInstanceOf(UpdateQueryBuilder);
  });

  it(".delete(table) returns instance of DeleteQueryBuilder", () => {
    const builder = qb.delete(table);
    expect(builder).toBeInstanceOf(DeleteQueryBuilder);
  });

  it("each call returns a fresh instance (no shared state)", () => {
    const s1 = qb.select(table);
    const s2 = qb.select(table);
    expect(s1).not.toBe(s2);

    const i1 = qb.insert(table);
    const i2 = qb.insert(table);
    expect(i1).not.toBe(i2);

    const u1 = qb.update(table);
    const u2 = qb.update(table);
    expect(u1).not.toBe(u2);

    const d1 = qb.delete(table);
    const d2 = qb.delete(table);
    expect(d1).not.toBe(d2);
  });
});
