import type { InsertQuery, SelectQuery } from "@/query-builder";
import { QueryType } from "@/query-builder";
import { setupDriver } from "@/drivers/postgres/__integration__/helpers";

describe("PostgresDriver error propagation (integration)", () => {
  const fixture = setupDriver("pool");

  it("rejects unique-constraint violation with code 23505", async () => {
    await fixture.rawQuery("INSERT INTO users (name, email) VALUES ('A', 'dup@x.com')");
    const insert: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [{ name: "B", email: "dup@x.com" }],
    };
    await expect(fixture.getDriver().query(insert)).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects FK violation with code 23503", async () => {
    const insert: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "orders" },
      values: [{ user_id: 9999, total: 10 }],
    };
    await expect(fixture.getDriver().query(insert)).rejects.toMatchObject({ code: "23503" });
  });

  it("rejects undefined-table query with code 42P01", async () => {
    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "no_such_table" },
      columns: [],
    };
    await expect(fixture.getDriver().query(select)).rejects.toMatchObject({ code: "42P01" });
  });
});
