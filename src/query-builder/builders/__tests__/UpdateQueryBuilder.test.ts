import { UpdateQueryBuilder } from "../UpdateQueryBuilder";
import { QueryBuilderError } from "@/query-builder/errors/QueryBuilderError";
import type { QueryBuilderWarning } from "@/query-builder/errors/QueryBuilderWarning";
import { QueryType, OrderDirection } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";

describe("UpdateQueryBuilder", () => {
  it("constructor sets the table", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } }).set({ a: 1 }).build();
    expect(query.table).toEqual({ name: "users" });
  });

  it(".set() sets values", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .build();
    expect(query.values).toEqual({ name: "Bob" });
  });

  it(".set() merges values when called multiple times", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .set({ age: 25 })
      .build();
    expect(query.values).toEqual({ name: "Bob", age: 25 });
  });

  it(".set() overwrites existing keys on merge", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .set({ name: "Alice" })
      .build();
    expect(query.values).toEqual({ name: "Alice" });
  });

  it(".where(callback) adds conditions via callback", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .where((b) => b.where({ name: "id" }, "=", 1))
      .build();
    expect(query.where).toEqual({
      type: ClauseType.Condition,
      conditionType: ConditionType.Group,
      conditions: [
        {
          type: ClauseType.Condition,
          conditionType: ConditionType.Base,
          left: { name: "id" },
          operator: "=",
          right: 1,
        },
      ],
    });
  });

  it(".where(col, op, val) adds conditions directly", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .where({ name: "id" }, "=", 1)
      .build();
    expect(query.where).toEqual({
      type: ClauseType.Condition,
      conditionType: ConditionType.Group,
      conditions: [
        {
          type: ClauseType.Condition,
          conditionType: ConditionType.Base,
          left: { name: "id" },
          operator: "=",
          right: 1,
        },
      ],
    });
  });

  it(".orderBy() sets order by clause", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .orderBy({ name: "name" }, OrderDirection.DESC)
      .build();
    expect(query.orderBy).toEqual({
      type: ClauseType.OrderBy,
      orders: [{ column: { name: "name" }, direction: "DESC" }],
    });
  });

  it(".limit() sets limit clause", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .limit(10)
      .build();
    expect(query.limit).toEqual({
      type: ClauseType.Limit,
      count: 10,
    });
  });

  it(".returning() sets returning clause", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .returning({ name: "id" }, { name: "name" })
      .build();
    expect(query.returning).toEqual({
      type: ClauseType.Returning,
      columns: [{ name: "id" }, { name: "name" }],
    });
  });

  it("full chain produces complete UpdateQuery", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob", age: 30 })
      .where({ name: "id" }, "=", 1)
      .orderBy({ name: "name" }, OrderDirection.ASC)
      .limit(1)
      .returning({ name: "id" })
      .build();
    expect(query).toEqual({
      type: QueryType.UPDATE,
      table: { name: "users" },
      values: { name: "Bob", age: 30 },
      where: {
        type: ClauseType.Condition,
        conditionType: ConditionType.Group,
        conditions: [
          {
            type: ClauseType.Condition,
            conditionType: ConditionType.Base,
            left: { name: "id" },
            operator: "=",
            right: 1,
          },
        ],
      },
      orderBy: {
        type: ClauseType.OrderBy,
        orders: [{ column: { name: "name" }, direction: OrderDirection.ASC }],
      },
      limit: { type: ClauseType.Limit, count: 1 },
      returning: {
        type: ClauseType.Returning,
        columns: [{ name: "id" }],
      },
    });
  });

  it("omitted clauses are absent from output", () => {
    const query = new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ name: "Bob" })
      .build();
    expect(query.type).toBe(QueryType.UPDATE);
    expect(query).not.toHaveProperty("where");
    expect(query).not.toHaveProperty("orderBy");
    expect(query).not.toHaveProperty("limit");
    expect(query).not.toHaveProperty("returning");
  });

  // --- Validation ---

  it("build() throws when set() was not called", () => {
    expect(() => new UpdateQueryBuilder({ table: { name: "users" } }).build())
      .toThrow(QueryBuilderError);
  });

  it("build() emits warning when no where() is set", () => {
    const warnings: QueryBuilderWarning[] = [];
    new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ a: 1 })
      .onWarning((w) => warnings.push(w))
      .build();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("UPDATE without WHERE");
  });

  it("build() does not emit warning when where() is set", () => {
    const warnings: QueryBuilderWarning[] = [];
    new UpdateQueryBuilder({ table: { name: "users" } })
      .set({ a: 1 })
      .where({ name: "id" }, "=", 1)
      .onWarning((w) => warnings.push(w))
      .build();
    expect(warnings).toHaveLength(0);
  });

  it("all methods return this for chaining", () => {
    const builder = new UpdateQueryBuilder({ table: { name: "users" } });
    expect(builder.set({ a: 1 })).toBe(builder);
    expect(builder.where({ name: "id" }, "=", 1)).toBe(builder);
    expect(builder.orderBy({ name: "id" })).toBe(builder);
    expect(builder.limit(5)).toBe(builder);
    expect(builder.returning({ name: "id" })).toBe(builder);
  });
});
