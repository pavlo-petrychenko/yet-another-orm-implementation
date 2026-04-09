import { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
import { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
import { InsertQueryBuilder } from "@/query-builder/builders/InsertQueryBuilder";
import { UpdateQueryBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
import { DeleteQueryBuilder } from "@/query-builder/builders/DeleteQueryBuilder";

describe("QueryBuilder", () => {
  let qb: QueryBuilder;

  beforeEach(() => {
    qb = new QueryBuilder();
  });

  it(".select() returns instance of SelectQueryBuilder", () => {
    const builder = qb.select();
    expect(builder).toBeInstanceOf(SelectQueryBuilder);
  });

  it('.select({ name: "id" }, { name: "name" }) returns SelectQueryBuilder with columns pre-set', () => {
    const builder = qb.select({ name: "id" }, { name: "name" });
    expect(builder).toBeInstanceOf(SelectQueryBuilder);
    const query = builder.from({ name: "users" }).build();
    expect(query.columns).toEqual([
      { name: "id" },
      { name: "name" },
    ]);
  });

  it(".insert() returns instance of InsertQueryBuilder", () => {
    const builder = qb.insert();
    expect(builder).toBeInstanceOf(InsertQueryBuilder);
  });

  it(".update() returns instance of UpdateQueryBuilder", () => {
    const builder = qb.update();
    expect(builder).toBeInstanceOf(UpdateQueryBuilder);
  });

  it(".delete() returns instance of DeleteQueryBuilder", () => {
    const builder = qb.delete();
    expect(builder).toBeInstanceOf(DeleteQueryBuilder);
  });

  it("each call returns a fresh instance (no shared state)", () => {
    const s1 = qb.select();
    const s2 = qb.select();
    expect(s1).not.toBe(s2);

    const i1 = qb.insert();
    const i2 = qb.insert();
    expect(i1).not.toBe(i2);

    const u1 = qb.update();
    const u2 = qb.update();
    expect(u1).not.toBe(u2);

    const d1 = qb.delete();
    const d2 = qb.delete();
    expect(d1).not.toBe(d2);
  });
});
