import type { BaseCondition, JoinClause, SelectQuery } from "@/query-builder";
import { ClauseType, ConditionType, JoinType, QueryType } from "@/query-builder";
import { setupDriver } from "@/drivers/postgres/__integration__/helpers";

const onUserId: BaseCondition = {
  type: ClauseType.Condition,
  conditionType: ConditionType.Base,
  left: { name: "user_id", table: "o" },
  operator: "=",
  right: { name: "id", table: "u" },
  isColumnComparison: true,
};

describe("PostgresDriver joins (integration)", () => {
  const fixture = setupDriver("pool");

  it("INNER JOIN returns matched user/order rows", async () => {
    await fixture.rawQuery(
      "INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'a@x.com'), (2, 'Bob', 'b@x.com')",
    );
    await fixture.rawQuery("INSERT INTO orders (user_id, total) VALUES (1, 10), (1, 20)");

    const join: JoinClause = {
      type: ClauseType.Join,
      joinType: JoinType.INNER,
      table: { name: "orders", alias: "o" },
      on: onUserId,
    };
    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users", alias: "u" },
      columns: [
        { name: "name", table: "u" },
        { name: "total", table: "o" },
      ],
      join: [join],
    };

    const result = await fixture.getDriver().query<{ name: string; total: string }>(select);
    expect(result.rows).toEqual([
      { name: "Alice", total: "10.00" },
      { name: "Alice", total: "20.00" },
    ]);
  });

  it("LEFT JOIN returns NULLs on the right side when unmatched", async () => {
    await fixture.rawQuery(
      "INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'a@x.com'), (2, 'Bob', 'b@x.com')",
    );
    await fixture.rawQuery("INSERT INTO orders (user_id, total) VALUES (1, 10)");

    const join: JoinClause = {
      type: ClauseType.Join,
      joinType: JoinType.LEFT,
      table: { name: "orders", alias: "o" },
      on: onUserId,
    };
    const select: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users", alias: "u" },
      columns: [
        { name: "name", table: "u" },
        { name: "total", table: "o" },
      ],
      join: [join],
    };

    const result = await fixture.getDriver().query<{ name: string; total: string | null }>(select);
    expect(result.rows).toEqual([
      { name: "Alice", total: "10.00" },
      { name: "Bob", total: null },
    ]);
  });
});
