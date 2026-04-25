import type { BaseCondition, InsertQuery, SelectQuery } from "@/query-builder";
import { ClauseType, ConditionType, QueryType } from "@/query-builder";
import { setupDriver } from "@/drivers/postgres/__integration__/helpers";

const baseCondition = (overrides: Partial<BaseCondition>): BaseCondition => ({
  type: ClauseType.Condition,
  conditionType: ConditionType.Base,
  left: { name: "id" },
  operator: "=",
  right: 1,
  ...overrides,
});

describe("PostgresDriver type round-trips (integration)", () => {
  const fixture = setupDriver("pool");

  it("null parameter is bound to a nullable column", async () => {
    const insert: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [{ name: "A", email: "a@x.com", age: null }],
      returning: { type: ClauseType.Returning, columns: [{ name: "age" }] },
    };
    const result = await fixture.getDriver().query<{ age: number | null }>(insert);
    expect(result.rows[0]?.age).toBeNull();
  });

  it("Date round-trips through TIMESTAMPTZ on insert and where", async () => {
    const when = new Date("2024-06-01T10:00:00.000Z");
    const other = new Date("2024-07-01T10:00:00.000Z");
    await fixture.rawQuery(
      "INSERT INTO users (name, email, created_at) VALUES ('A', 'a@x.com', $1), ('B', 'b@x.com', $2)",
      [when, other],
    );

    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [{ name: "name" }, { name: "created_at" }],
      where: baseCondition({ left: { name: "created_at" }, operator: "=", right: when }),
    };
    const result = await fixture.getDriver().query<{ name: string; created_at: Date }>(select);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.name).toBe("A");
    expect(result.rows[0]?.created_at).toBeInstanceOf(Date);
    expect(result.rows[0]?.created_at.getTime()).toBe(when.getTime());
  });

  it("JSONB object parameter round-trips", async () => {
    const metadata = { plan: "pro", features: ["a", "b"], count: 3 };
    const insert: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [{ name: "A", email: "a@x.com", metadata }],
      returning: { type: ClauseType.Returning, columns: [{ name: "metadata" }] },
    };
    const result = await fixture.getDriver().query<{ metadata: typeof metadata }>(insert);
    expect(result.rows[0]?.metadata).toEqual(metadata);
  });

  it("BETWEEN binds two parameters and matches the inclusive range", async () => {
    await fixture.rawQuery(
      "INSERT INTO users (name, email, age) VALUES ('A', 'a@x.com', 17), ('B', 'b@x.com', 18), ('C', 'c@x.com', 30), ('D', 'd@x.com', 31)",
    );
    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [{ name: "name" }],
      where: baseCondition({ left: { name: "age" }, operator: "BETWEEN", right: [18, 30] }),
    };
    const result = await fixture.getDriver().query<{ name: string }>(select);
    expect(result.rows).toEqual([{ name: "B" }, { name: "C" }]);
  });

  it("ILIKE matches case-insensitively", async () => {
    await fixture.rawQuery(
      "INSERT INTO users (name, email) VALUES ('Alice', 'a@x.com'), ('alex', 'al@x.com'), ('Bob', 'b@x.com')",
    );
    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [{ name: "name" }],
      where: baseCondition({ left: { name: "name" }, operator: "ILIKE", right: "al%" }),
    };
    const result = await fixture.getDriver().query<{ name: string }>(select);
    expect(result.rows).toEqual([{ name: "Alice" }, { name: "alex" }]);
  });

  it("empty IN compiles to IN (NULL) and returns zero rows", async () => {
    await fixture.rawQuery("INSERT INTO users (name, email) VALUES ('A', 'a@x.com'), ('B', 'b@x.com')");
    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [{ name: "name" }],
      where: baseCondition({ left: { name: "id" }, operator: "IN", right: [] }),
    };
    const result = await fixture.getDriver().query<{ name: string }>(select);
    expect(result.rowCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it("non-empty IN binds each element as a parameter", async () => {
    await fixture.rawQuery(
      "INSERT INTO users (name, email) VALUES ('A', 'a@x.com'), ('B', 'b@x.com'), ('C', 'c@x.com')",
    );
    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [{ name: "name" }],
      where: baseCondition({ left: { name: "name" }, operator: "IN", right: ["A", "C"] }),
    };
    const result = await fixture.getDriver().query<{ name: string }>(select);
    expect(result.rows).toEqual([{ name: "A" }, { name: "C" }]);
  });
});
