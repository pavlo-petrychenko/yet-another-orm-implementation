import type {
  BaseCondition,
  ConditionGroup,
  DeleteQuery,
  InsertQuery,
  JoinClause,
  SelectQuery,
  UpdateQuery,
} from "@/query-builder";
import {
  ClauseType,
  ConditionType,
  JoinType,
  LogicalOperator,
  OrderDirection,
  QueryType,
} from "@/query-builder";
import { PostgresDialect } from "@/drivers/postgres/dialect/PostgresDialect";

const dialect = new PostgresDialect();

const eq = (col: string, value: unknown): BaseCondition => ({
  type: ClauseType.Condition,
  conditionType: ConditionType.Base,
  left: { name: col },
  operator: "=",
  right: value as BaseCondition["right"],
});

describe("PostgresDialect — SELECT", () => {
  it("compiles SELECT * with no columns", () => {
    const query: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [],
    };
    expect(dialect.buildQuery(query)).toEqual({ sql: `SELECT * FROM "users"`, params: [] });
  });

  it("emits DISTINCT and column aliases", () => {
    const query: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users", alias: "u" },
      distinct: true,
      columns: [
        { name: "id", table: "u" },
        { name: "name", table: "u", alias: "user_name" },
      ],
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(`SELECT DISTINCT "u"."id", "u"."name" AS "user_name" FROM "users" AS "u"`);
    expect(result.params).toEqual([]);
  });

  it("compiles WHERE with multiple conditions", () => {
    const where: ConditionGroup = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Group,
      conditions: [
        eq("status", "active"),
        { ...eq("age", 18), operator: ">=", connector: LogicalOperator.AND },
      ],
    };
    const query: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [],
      where,
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(`SELECT * FROM "users" WHERE "status" = $1 AND "age" >= $2`);
    expect(result.params).toEqual(["active", 18]);
  });

  it("compiles INNER, LEFT, RIGHT, FULL, CROSS joins", () => {
    const onUserId: BaseCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left: { name: "user_id", table: "orders" },
      operator: "=",
      right: { name: "id", table: "users" },
      isColumnComparison: true,
    };
    const buildJoin = (joinType: JoinType): JoinClause => ({
      type: ClauseType.Join,
      joinType,
      table: { name: "orders", alias: "o" },
      on: onUserId,
    });

    for (const joinType of [JoinType.INNER, JoinType.LEFT, JoinType.RIGHT, JoinType.FULL]) {
      const query: SelectQuery = {
        type: QueryType.SELECT,
        table: { name: "users", alias: "u" },
        columns: [],
        join: [buildJoin(joinType)],
      };
      const result = dialect.buildQuery(query);
      expect(result.sql).toBe(
        `SELECT * FROM "users" AS "u" ${joinType} JOIN "orders" AS "o" ON "orders"."user_id" = "users"."id"`,
      );
    }

    const crossQuery: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [],
      join: [{ type: ClauseType.Join, joinType: JoinType.CROSS, table: { name: "products" } }],
    };
    expect(dialect.buildQuery(crossQuery).sql).toBe(`SELECT * FROM "users" CROSS JOIN "products"`);
  });

  it("compiles GROUP BY + HAVING + ORDER BY + LIMIT + OFFSET in order", () => {
    const query: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "events" },
      columns: [{ name: "country" }],
      groupBy: { type: ClauseType.GroupBy, columns: [{ name: "country" }] },
      having: eq("country", "US"),
      orderBy: {
        type: ClauseType.OrderBy,
        orders: [{ column: { name: "country" }, direction: OrderDirection.ASC }],
      },
      limit: { type: ClauseType.Limit, count: 10 },
      offset: { type: ClauseType.Offset, count: 20 },
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(
      `SELECT "country" FROM "events" GROUP BY "country" HAVING "country" = $1 ORDER BY "country" ASC LIMIT 10 OFFSET 20`,
    );
    expect(result.params).toEqual(["US"]);
  });

  it("compiles UNION and UNION ALL with shared parameter numbering", () => {
    const left: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "a" },
      columns: [],
      where: eq("x", 1),
    };
    const right: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "b" },
      columns: [],
      where: eq("y", 2),
    };
    const query: SelectQuery = { ...left, unions: [{ query: right, all: true }] };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(
      `SELECT * FROM "a" WHERE "x" = $1 UNION ALL SELECT * FROM "b" WHERE "y" = $2`,
    );
    expect(result.params).toEqual([1, 2]);
  });

  it("substitutes ? placeholders in rawColumns", () => {
    const query: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "events" },
      columns: [],
      rawColumns: [{ type: "raw", sql: "COUNT(*) FILTER (WHERE flag = ?) AS hits", params: [true] }],
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(
      `SELECT COUNT(*) FILTER (WHERE flag = $1) AS hits FROM "events"`,
    );
    expect(result.params).toEqual([true]);
  });

  it("inlines a subquery on the RHS of a condition", () => {
    const sub: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "admins" },
      columns: [{ name: "user_id" }],
    };
    const where: BaseCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left: { name: "id" },
      operator: "IN",
      right: sub,
    };
    const query: SelectQuery = {
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [],
      where,
    };
    expect(dialect.buildQuery(query).sql).toBe(
      `SELECT * FROM "users" WHERE "id" IN (SELECT "user_id" FROM "admins")`,
    );
  });
});

describe("PostgresDialect — INSERT", () => {
  it("compiles single-row insert", () => {
    const query: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [{ name: "Alice", age: 30 }],
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(`INSERT INTO "users" ("name", "age") VALUES ($1, $2)`);
    expect(result.params).toEqual(["Alice", 30]);
  });

  it("compiles multi-row insert preserving column order", () => {
    const query: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ],
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(`INSERT INTO "users" ("name", "age") VALUES ($1, $2), ($3, $4)`);
    expect(result.params).toEqual(["Alice", 30, "Bob", 25]);
  });

  it("appends RETURNING clause", () => {
    const query: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [{ name: "Alice" }],
      returning: { type: ClauseType.Returning, columns: [{ name: "id" }, { name: "created_at", alias: "ts" }] },
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(
      `INSERT INTO "users" ("name") VALUES ($1) RETURNING "id", "created_at" AS "ts"`,
    );
  });

  it("throws on empty values array", () => {
    const query: InsertQuery = {
      type: QueryType.INSERT,
      table: { name: "users" },
      values: [],
    };
    expect(() => dialect.buildQuery(query)).toThrow("INSERT requires at least one row");
  });
});

describe("PostgresDialect — UPDATE", () => {
  it("compiles SET + WHERE + RETURNING", () => {
    const query: UpdateQuery = {
      type: QueryType.UPDATE,
      table: { name: "users" },
      values: { name: "Alice", age: 31 },
      where: eq("id", 7),
      returning: { type: ClauseType.Returning, columns: [{ name: "id" }] },
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(`UPDATE "users" SET "name" = $1, "age" = $2 WHERE "id" = $3 RETURNING "id"`);
    expect(result.params).toEqual(["Alice", 31, 7]);
  });

  it("silently ignores ORDER BY and LIMIT (PG doesn't support them on UPDATE)", () => {
    const query: UpdateQuery = {
      type: QueryType.UPDATE,
      table: { name: "users" },
      values: { name: "X" },
      orderBy: { type: ClauseType.OrderBy, orders: [{ column: { name: "id" }, direction: OrderDirection.ASC }] },
      limit: { type: ClauseType.Limit, count: 1 },
    };
    expect(dialect.buildQuery(query).sql).toBe(`UPDATE "users" SET "name" = $1`);
  });

  it("throws when no SET columns", () => {
    const query: UpdateQuery = {
      type: QueryType.UPDATE,
      table: { name: "users" },
      values: {},
    };
    expect(() => dialect.buildQuery(query)).toThrow("UPDATE requires at least one column to set");
  });
});

describe("PostgresDialect — DELETE", () => {
  it("compiles DELETE with no WHERE", () => {
    const query: DeleteQuery = { type: QueryType.DELETE, table: { name: "users" } };
    expect(dialect.buildQuery(query)).toEqual({ sql: `DELETE FROM "users"`, params: [] });
  });

  it("compiles DELETE with WHERE + RETURNING", () => {
    const query: DeleteQuery = {
      type: QueryType.DELETE,
      table: { name: "users" },
      where: eq("id", 42),
      returning: { type: ClauseType.Returning, columns: [{ name: "id" }] },
    };
    const result = dialect.buildQuery(query);
    expect(result.sql).toBe(`DELETE FROM "users" WHERE "id" = $1 RETURNING "id"`);
    expect(result.params).toEqual([42]);
  });

  it("silently ignores ORDER BY and LIMIT", () => {
    const query: DeleteQuery = {
      type: QueryType.DELETE,
      table: { name: "users" },
      where: eq("id", 1),
      orderBy: { type: ClauseType.OrderBy, orders: [{ column: { name: "id" }, direction: OrderDirection.DESC }] },
      limit: { type: ClauseType.Limit, count: 1 },
    };
    expect(dialect.buildQuery(query).sql).toBe(`DELETE FROM "users" WHERE "id" = $1`);
  });
});

describe("PostgresDialect — buildQuery isolation", () => {
  it("creates a fresh ParameterManager per call (numbering resets)", () => {
    const a = dialect.buildQuery({
      type: QueryType.SELECT,
      table: { name: "t" },
      columns: [],
      where: eq("x", 1),
    });
    const b = dialect.buildQuery({
      type: QueryType.SELECT,
      table: { name: "t" },
      columns: [],
      where: eq("y", 2),
    });
    expect(a.sql).toBe(`SELECT * FROM "t" WHERE "x" = $1`);
    expect(b.sql).toBe(`SELECT * FROM "t" WHERE "y" = $1`);
  });
});
