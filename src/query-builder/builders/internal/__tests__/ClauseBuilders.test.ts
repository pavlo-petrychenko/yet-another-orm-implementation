import { GroupByClauseBuilder } from "../GroupByClauseBuilder";
import { OrderByClauseBuilder } from "../OrderByClauseBuilder";
import { LimitClauseBuilder } from "../LimitClauseBuilder";
import { OffsetClauseBuilder } from "../OffsetClauseBuilder";
import { ReturningClauseBuilder } from "../ReturningClauseBuilder";
import { ClauseType } from "@/query-builder/types/clause/Clause";
import { OrderDirection } from "@/query-builder/types/common/OrderDirection";

describe("GroupByClauseBuilder", () => {
  it("should be empty when no columns set", () => {
    const builder = new GroupByClauseBuilder();
    expect(builder.isEmpty()).toBe(true);
  });

  it("should build a GroupByClause from set()", () => {
    const builder = new GroupByClauseBuilder();
    builder.set({ name: "a" }, { name: "b" });
    expect(builder.build()).toEqual({
      type: ClauseType.GroupBy,
      columns: [{ name: "a" }, { name: "b" }],
    });
  });

  it("should replace columns on set()", () => {
    const builder = new GroupByClauseBuilder();
    builder.set({ name: "a" });
    builder.set({ name: "b" }, { name: "c" });
    expect(builder.build()).toEqual({
      type: ClauseType.GroupBy,
      columns: [{ name: "b" }, { name: "c" }],
    });
  });

  it("should append columns on add()", () => {
    const builder = new GroupByClauseBuilder();
    builder.set({ name: "a" });
    builder.add({ name: "b" });
    expect(builder.build().columns).toEqual([{ name: "a" }, { name: "b" }]);
  });

  it("should accept ColumnDescription with table field", () => {
    const builder = new GroupByClauseBuilder();
    builder.set({ name: "name", table: "users" });
    expect(builder.build().columns).toEqual([{ name: "name", table: "users" }]);
  });
});

describe("OrderByClauseBuilder", () => {
  it("should be empty when no orders added", () => {
    const builder = new OrderByClauseBuilder();
    expect(builder.isEmpty()).toBe(true);
  });

  it("should build an OrderByClause from add()", () => {
    const builder = new OrderByClauseBuilder();
    builder.add({ name: "name" }, OrderDirection.ASC);
    expect(builder.build()).toEqual({
      type: ClauseType.OrderBy,
      orders: [{ column: { name: "name" }, direction: OrderDirection.ASC }],
    });
  });

  it("should accumulate multiple adds", () => {
    const builder = new OrderByClauseBuilder();
    builder.add({ name: "name" }, OrderDirection.ASC);
    builder.add({ name: "age" }, OrderDirection.DESC);
    expect(builder.build().orders).toHaveLength(2);
  });

  it("should accept ColumnDescription with table field", () => {
    const builder = new OrderByClauseBuilder();
    builder.add({ name: "name", table: "users" }, OrderDirection.DESC);
    expect(builder.build().orders[0].column).toEqual({ name: "name", table: "users" });
  });
});

describe("LimitClauseBuilder", () => {
  it("should be empty when unset", () => {
    const builder = new LimitClauseBuilder();
    expect(builder.isEmpty()).toBe(true);
  });

  it("should build a LimitClause from set()", () => {
    const builder = new LimitClauseBuilder();
    builder.set(10);
    expect(builder.build()).toEqual({
      type: ClauseType.Limit,
      count: 10,
    });
  });
});

describe("OffsetClauseBuilder", () => {
  it("should be empty when unset", () => {
    const builder = new OffsetClauseBuilder();
    expect(builder.isEmpty()).toBe(true);
  });

  it("should build an OffsetClause from set()", () => {
    const builder = new OffsetClauseBuilder();
    builder.set(5);
    expect(builder.build()).toEqual({
      type: ClauseType.Offset,
      count: 5,
    });
  });
});

describe("ReturningClauseBuilder", () => {
  it("should be empty when no columns set", () => {
    const builder = new ReturningClauseBuilder();
    expect(builder.isEmpty()).toBe(true);
  });

  it("should build a ReturningClause from set()", () => {
    const builder = new ReturningClauseBuilder();
    builder.set({ name: "id" }, { name: "name" });
    expect(builder.build()).toEqual({
      type: ClauseType.Returning,
      columns: [{ name: "id" }, { name: "name" }],
    });
  });

  it("should accept ColumnDescription with table field", () => {
    const builder = new ReturningClauseBuilder();
    builder.set({ name: "id", table: "users" });
    expect(builder.build().columns).toEqual([{ name: "id", table: "users" }]);
  });
});
