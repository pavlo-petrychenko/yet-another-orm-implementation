import type { BaseCondition, SelectQuery } from "@/query-builder";
import { ClauseType, ConditionType, QueryType } from "@/query-builder";
import { setupDriver } from "@/drivers/postgres/__integration__/helpers";

describe("PostgresDriver concurrency (integration)", () => {
  const fixture = setupDriver("pool");

  it("20 parallel queries return distinct results matching their parameters", async () => {
    const seedValues = Array.from({ length: 20 }, (_, i) => `('U${String(i)}', 'u${String(i)}@x.com', ${String(i)})`);
    await fixture.rawQuery(`INSERT INTO users (name, email, age) VALUES ${seedValues.join(", ")}`);

    const driver = fixture.getDriver();
    const queries = Array.from({ length: 20 }, (_, i) => {
      const where: BaseCondition = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Base,
        left: { name: "age" },
        operator: "=",
        right: i,
      };
      const select: SelectQuery = {
        type: QueryType.SELECT,
        table: { name: "users" },
        columns: [{ name: "name" }],
        where,
      };
      return driver.query<{ name: string }>(select);
    });

    const results = await Promise.all(queries);
    results.forEach((result, i) => {
      expect(result.rows).toEqual([{ name: `U${String(i)}` }]);
    });
  });
});
