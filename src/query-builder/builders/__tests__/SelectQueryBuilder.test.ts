import { SelectQueryBuilder } from "../SelectQueryBuilder";
import { QueryBuilderError } from "@/query-builder/errors/QueryBuilderError";
import { QueryType, JoinType, OrderDirection, type ConditionGroup } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";

/* eslint-disable @typescript-eslint/no-non-null-assertion, no-empty-function */

describe("SelectQueryBuilder", () => {
  // --- Table ---

  it("constructor sets the table", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } }).build();
    expect(query.table).toEqual({ name: "users" });
  });

  it("constructor sets table with alias", () => {
    const query = new SelectQueryBuilder({ table: { name: "users", alias: "u" } }).build();
    expect(query.table).toEqual({ name: "users", alias: "u" });
    expect(query.tableAlias).toBe("u");
  });

  // --- Columns ---

  it('.select({ name: "id" }, { name: "name" }) sets columns', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .select({ name: "id" }, { name: "name" })
      .build();
    expect(query.columns).toEqual([{ name: "id" }, { name: "name" }]);
  });

  it('.select({ name: "name", table: "users", alias: "username" }) handles table + alias', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .select({ name: "name", table: "users", alias: "username" })
      .build();
    expect(query.columns).toEqual([
      { name: "name", table: "users", alias: "username" },
    ]);
  });

  it('.selectRaw("COUNT(*) AS total") adds raw column', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .selectRaw("COUNT(*) AS total")
      .build();
    expect(query.rawColumns).toEqual([
      { type: "raw", sql: "COUNT(*) AS total", params: [] },
    ]);
  });

  // --- Distinct ---

  it(".distinct() enables distinct", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .distinct()
      .build();
    expect(query.distinct).toBe(true);
  });

  // --- WHERE ---

  it(".where(callback) sets where clause", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .where((w) => w.where({ name: "age" }, ">", 18))
      .build();
    expect(query.where).toBeDefined();
    expect((query.where as ConditionGroup).conditions).toHaveLength(1);
  });

  it('.where({ name: "age" }, ">", 18) shorthand produces same result', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .where({ name: "age" }, ">", 18)
      .build();
    expect(query.where).toBeDefined();
    const where = query.where as ConditionGroup;
    expect(where.conditions).toHaveLength(1);
    const cond = where.conditions[0];
    expect(cond.conditionType).toBe(ConditionType.Base);
  });

  it(".andWhere() delegates correctly", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .where({ name: "age" }, ">", 18)
      .andWhere({ name: "name" }, "=", "Alice")
      .build();
    expect((query.where as ConditionGroup).conditions).toHaveLength(2);
  });

  it(".orWhere() delegates correctly", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .where({ name: "age" }, ">", 18)
      .orWhere({ name: "role" }, "=", "admin")
      .build();
    expect((query.where as ConditionGroup).conditions).toHaveLength(2);
  });

  // --- JOIN ---

  it(".join() creates INNER join with ON condition", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .join({ name: "orders" }, (on) => on.where({ name: "id", table: "users" }, "=", { name: "user_id", table: "orders" }, true))
      .build();
    expect(query.join).toHaveLength(1);
    expect(query.join![0].joinType).toBe(JoinType.INNER);
    expect(query.join![0].table).toEqual({ name: "orders" });
  });

  it(".leftJoin() creates LEFT join", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .leftJoin({ name: "orders" }, (on) => on.where({ name: "id", table: "users" }, "=", { name: "user_id", table: "orders" }, true))
      .build();
    expect(query.join![0].joinType).toBe(JoinType.LEFT);
  });

  it(".rightJoin() creates RIGHT join", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .rightJoin({ name: "orders" }, (on) => on.where({ name: "id", table: "users" }, "=", { name: "user_id", table: "orders" }, true))
      .build();
    expect(query.join![0].joinType).toBe(JoinType.RIGHT);
  });

  it(".fullJoin() creates FULL join", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .fullJoin({ name: "orders" }, (on) => on.where({ name: "id", table: "users" }, "=", { name: "user_id", table: "orders" }, true))
      .build();
    expect(query.join![0].joinType).toBe(JoinType.FULL);
  });

  it('.crossJoin({ name: "other" }) creates CROSS join without ON', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .crossJoin({ name: "other" })
      .build();
    expect(query.join![0].joinType).toBe(JoinType.CROSS);
    expect(query.join![0].on).toBeUndefined();
  });

  // --- GROUP BY / HAVING ---

  it('.groupBy({ name: "status" }) sets groupBy clause', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .groupBy({ name: "status" })
      .build();
    expect(query.groupBy).toEqual({
      type: ClauseType.GroupBy,
      columns: [{ name: "status" }],
    });
  });

  it(".having(callback) sets having clause", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .groupBy({ name: "status" })
      .having((h) => h.where({ name: "count" }, ">", 5))
      .build();
    expect(query.having).toBeDefined();
    expect((query.having as ConditionGroup).conditions).toHaveLength(1);
  });

  // --- ORDER BY / LIMIT / OFFSET ---

  it('.orderBy({ name: "name" }, OrderDirection.ASC) sets orderBy clause', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .orderBy({ name: "name" }, OrderDirection.ASC)
      .build();
    expect(query.orderBy).toEqual({
      type: ClauseType.OrderBy,
      orders: [{ column: { name: "name" }, direction: "ASC" }],
    });
  });

  it(".limit(10) sets limit clause", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .limit(10)
      .build();
    expect(query.limit).toEqual({ type: ClauseType.Limit, count: 10 });
  });

  it(".offset(20) sets offset clause", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .limit(100)
      .offset(20)
      .build();
    expect(query.offset).toEqual({ type: ClauseType.Offset, count: 20 });
  });

  // --- RETURNING ---

  it('.returning({ name: "id" }) sets returning clause', () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .returning({ name: "id" })
      .build();
    expect(query.returning).toEqual({
      type: ClauseType.Returning,
      columns: [{ name: "id" }],
    });
  });

  // --- UNION ---

  it(".union(otherQuery) adds a union", () => {
    const other: any = {
      type: QueryType.SELECT,
      table: { name: "admins" },
      columns: [{ name: "id" }],
    };
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .select({ name: "id" })
      .union(other)
      .build();
    expect(query.unions).toEqual([{ query: other, all: false }]);
  });

  it(".unionAll(otherBuilder) adds a union all from builder", () => {
    const otherBuilder = new SelectQueryBuilder({ table: { name: "admins" } })
      .select({ name: "id" });
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .select({ name: "id" })
      .unionAll(otherBuilder)
      .build();
    expect(query.unions).toHaveLength(1);
    expect(query.unions![0].all).toBe(true);
    expect(query.unions![0].query.table).toEqual({ name: "admins" });
  });

  // --- Full chain ---

  it("full chain builds a complete SelectQuery", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } })
      .select({ name: "id" }, { name: "name" })
      .where({ name: "age" }, ">", 18)
      .orderBy({ name: "name" }, OrderDirection.ASC)
      .limit(10)
      .build();
    expect(query.type).toBe(QueryType.SELECT);
    expect(query.table).toEqual({ name: "users" });
    expect(query.columns).toEqual([{ name: "id" }, { name: "name" }]);
    expect(query.where).toBeDefined();
    expect(query.orderBy).toBeDefined();
    expect(query.limit).toEqual({ type: ClauseType.Limit, count: 10 });
  });

  // --- Empty builder ---

  it("empty builder produces minimal SelectQuery", () => {
    const query = new SelectQueryBuilder({ table: { name: "users" } }).build();
    expect(query).toEqual({
      type: QueryType.SELECT,
      table: { name: "users" },
      columns: [],
    });
  });

  // --- Validation ---

  it("build() throws when having() is used without groupBy()", () => {
    expect(() =>
      new SelectQueryBuilder({ table: { name: "users" } })
        .having({ name: "count" }, ">", 5)
        .build()
    ).toThrow(QueryBuilderError);
  });

  it("build() throws when offset() is used without limit()", () => {
    expect(() =>
      new SelectQueryBuilder({ table: { name: "users" } })
        .offset(10)
        .build()
    ).toThrow(QueryBuilderError);
  });

  it("build() throws with all errors collected", () => {
    try {
      new SelectQueryBuilder({ table: { name: "users" } })
        .having({ name: "count" }, ">", 5)
        .offset(10)
        .build();
      fail("Expected QueryBuilderError");
    } catch (e) {
      expect(e).toBeInstanceOf(QueryBuilderError);
      expect((e as QueryBuilderError).validationErrors).toHaveLength(2);
    }
  });

  // --- Chaining ---

  it("all methods return this for chaining", () => {
    const builder = new SelectQueryBuilder({ table: { name: "users" } });
    expect(builder.select({ name: "id" })).toBe(builder);
    expect(builder.selectRaw("1")).toBe(builder);
    expect(builder.distinct()).toBe(builder);
    expect(builder.where({ name: "a" }, "=", 1)).toBe(builder);
    expect(builder.andWhere({ name: "b" }, "=", 2)).toBe(builder);
    expect(builder.orWhere({ name: "c" }, "=", 3)).toBe(builder);
    expect(builder.join({ name: "t" }, (_b) => {})).toBe(builder);
    expect(builder.leftJoin({ name: "t" }, (_b) => {})).toBe(builder);
    expect(builder.rightJoin({ name: "t" }, (_b) => {})).toBe(builder);
    expect(builder.fullJoin({ name: "t" }, (_b) => {})).toBe(builder);
    expect(builder.crossJoin({ name: "t" })).toBe(builder);
    expect(builder.groupBy({ name: "a" })).toBe(builder);
    expect(builder.having({ name: "a" }, ">", 1)).toBe(builder);
    expect(builder.orderBy({ name: "a" })).toBe(builder);
    expect(builder.limit(1)).toBe(builder);
    expect(builder.offset(1)).toBe(builder);
    expect(builder.returning({ name: "id" })).toBe(builder);
    expect(builder.union({ type: QueryType.SELECT, table: { name: "x" }, columns: [] })).toBe(builder);
    expect(builder.unionAll({ type: QueryType.SELECT, table: { name: "x" }, columns: [] })).toBe(builder);
  });
});
