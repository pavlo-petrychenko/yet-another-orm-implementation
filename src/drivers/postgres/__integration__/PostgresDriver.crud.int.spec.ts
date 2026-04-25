import type { BaseCondition, DeleteQuery, InsertQuery, SelectQuery, UpdateQuery } from "@/query-builder";
import { ClauseType, ConditionType, QueryType } from "@/query-builder";
import { setupDriver } from "@/drivers/postgres/__integration__/helpers";

interface UserRow {
  id: number;
  name: string;
  email: string;
  age: number | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

const eqCondition = (column: string, value: unknown): BaseCondition => ({
  type: ClauseType.Condition,
  conditionType: ConditionType.Base,
  left: { name: column },
  operator: "=",
  right: value as BaseCondition["right"],
});

describe("PostgresDriver CRUD (integration)", () => {
  for (const mode of ["pool", "client"] as const) {
    describe(`mode=${mode}`, () => {
      const fixture = setupDriver(mode);

      it("INSERT one row sets rowCount=1", async () => {
        const insert: InsertQuery = {
          type: QueryType.INSERT,
          table: { name: "users" },
          values: [{ name: "Alice", email: "alice@example.com", age: 30 }],
        };
        const result = await fixture.getDriver().query(insert);
        expect(result.rowCount).toBe(1);

        const dbRows = await fixture.rawQuery<UserRow>("SELECT id, name, email, age FROM users");
        expect(dbRows).toEqual([{ id: 1, name: "Alice", email: "alice@example.com", age: 30 }]);
      });

      it("INSERT … RETURNING populates rows", async () => {
        const insert: InsertQuery = {
          type: QueryType.INSERT,
          table: { name: "users" },
          values: [{ name: "Bob", email: "bob@example.com", age: 25 }],
          returning: { type: ClauseType.Returning, columns: [{ name: "id" }, { name: "name" }] },
        };
        const result = await fixture.getDriver().query<{ id: number; name: string }>(insert);
        expect(result.rowCount).toBe(1);
        expect(result.rows).toEqual([{ id: 1, name: "Bob" }]);
      });

      it("INSERT multi-row preserves parameter ordering", async () => {
        const insert: InsertQuery = {
          type: QueryType.INSERT,
          table: { name: "users" },
          values: [
            { name: "A", email: "a@x.com", age: 1 },
            { name: "B", email: "b@x.com", age: 2 },
            { name: "C", email: "c@x.com", age: 3 },
          ],
          returning: { type: ClauseType.Returning, columns: [{ name: "name" }, { name: "age" }] },
        };
        const result = await fixture.getDriver().query<{ name: string; age: number }>(insert);
        expect(result.rowCount).toBe(3);
        expect(result.rows).toEqual([
          { name: "A", age: 1 },
          { name: "B", age: 2 },
          { name: "C", age: 3 },
        ]);
      });

      it("SELECT * returns all rows", async () => {
        await fixture.rawQuery(
          "INSERT INTO users (name, email, age) VALUES ($1, $2, $3), ($4, $5, $6)",
          ["A", "a@x.com", 10, "B", "b@x.com", 20],
        );
        const select: SelectQuery = {
          type: QueryType.SELECT,
          table: { name: "users" },
          columns: [{ name: "name" }, { name: "age" }],
        };
        const result = await fixture.getDriver().query<{ name: string; age: number }>(select);
        expect(result.rowCount).toBe(2);
        expect(result.rows).toEqual([
          { name: "A", age: 10 },
          { name: "B", age: 20 },
        ]);
      });

      it("SELECT WHERE filters by bound parameters", async () => {
        await fixture.rawQuery(
          "INSERT INTO users (name, email, age, active) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)",
          ["A", "a@x.com", 18, true, "B", "b@x.com", 30, false],
        );
        const select: SelectQuery = {
          type: QueryType.SELECT,
          table: { name: "users" },
          columns: [{ name: "name" }],
          where: eqCondition("active", true),
        };
        const result = await fixture.getDriver().query<{ name: string }>(select);
        expect(result.rows).toEqual([{ name: "A" }]);
      });

      it("UPDATE returns rowCount of affected rows", async () => {
        await fixture.rawQuery("INSERT INTO users (name, email) VALUES ('A', 'a@x.com'), ('B', 'b@x.com')");
        const update: UpdateQuery = {
          type: QueryType.UPDATE,
          table: { name: "users" },
          values: { active: false },
        };
        const result = await fixture.getDriver().query(update);
        expect(result.rowCount).toBe(2);
      });

      it("UPDATE matching no rows returns rowCount=0", async () => {
        const update: UpdateQuery = {
          type: QueryType.UPDATE,
          table: { name: "users" },
          values: { name: "Z" },
          where: eqCondition("id", 9999),
        };
        const result = await fixture.getDriver().query(update);
        expect(result.rowCount).toBe(0);
      });

      it("UPDATE … RETURNING reflects new values", async () => {
        await fixture.rawQuery("INSERT INTO users (name, email, age) VALUES ('A', 'a@x.com', 30)");
        const update: UpdateQuery = {
          type: QueryType.UPDATE,
          table: { name: "users" },
          values: { age: 31 },
          where: eqCondition("name", "A"),
          returning: { type: ClauseType.Returning, columns: [{ name: "name" }, { name: "age" }] },
        };
        const result = await fixture.getDriver().query<{ name: string; age: number }>(update);
        expect(result.rows).toEqual([{ name: "A", age: 31 }]);
      });

      it("DELETE returns rowCount and RETURNING gives deleted rows", async () => {
        await fixture.rawQuery("INSERT INTO users (name, email) VALUES ('A', 'a@x.com'), ('B', 'b@x.com')");
        const del: DeleteQuery = {
          type: QueryType.DELETE,
          table: { name: "users" },
          where: eqCondition("name", "A"),
          returning: { type: ClauseType.Returning, columns: [{ name: "name" }] },
        };
        const result = await fixture.getDriver().query<{ name: string }>(del);
        expect(result.rowCount).toBe(1);
        expect(result.rows).toEqual([{ name: "A" }]);

        const remaining = await fixture.rawQuery<{ name: string }>("SELECT name FROM users");
        expect(remaining).toEqual([{ name: "B" }]);
      });
    });
  }
});
