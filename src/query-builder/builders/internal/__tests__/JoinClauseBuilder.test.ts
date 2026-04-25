import { JoinClauseBuilder } from "../JoinClauseBuilder";
import { ClauseType } from "@/query-builder/types/clause/Clause";
import { JoinType } from "@/query-builder/types/clause/JoinClause/typedefs";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";

describe("JoinClauseBuilder", () => {
  it("should be empty when no joins added", () => {
    const builder = new JoinClauseBuilder();
    expect(builder.isEmpty()).toBe(true);
  });

  it("should build a single INNER JOIN with ON condition", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.INNER, { name: "orders" }, (on) => {
      on.where({ name: "user_id", table: "orders" }, "=", { name: "id", table: "users" }, true);
    });

    const result = builder.build();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: ClauseType.Join,
      joinType: JoinType.INNER,
      table: { name: "orders" },
      on: {
        type: ClauseType.Condition,
        conditionType: ConditionType.Group,
        conditions: [
          {
            type: ClauseType.Condition,
            conditionType: ConditionType.Base,
            left: { name: "user_id", table: "orders" },
            operator: "=",
            right: { name: "id", table: "users" },
            isColumnComparison: true,
          },
        ],
      },
    });
  });

  it("should set LEFT join type correctly", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.LEFT, { name: "orders" }, (on) => {
      on.where({ name: "user_id", table: "orders" }, "=", { name: "id", table: "users" }, true);
    });
    expect(builder.build()[0].joinType).toBe(JoinType.LEFT);
  });

  it("should set RIGHT join type correctly", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.RIGHT, { name: "orders" }, (on) => {
      on.where({ name: "user_id", table: "orders" }, "=", { name: "id", table: "users" }, true);
    });
    expect(builder.build()[0].joinType).toBe(JoinType.RIGHT);
  });

  it("should set FULL join type correctly", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.FULL, { name: "orders" }, (on) => {
      on.where({ name: "user_id", table: "orders" }, "=", { name: "id", table: "users" }, true);
    });
    expect(builder.build()[0].joinType).toBe(JoinType.FULL);
  });

  it("should handle CROSS JOIN with no ON callback", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.CROSS, { name: "settings" });

    const result = builder.build();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: ClauseType.Join,
      joinType: JoinType.CROSS,
      table: { name: "settings" },
    });
    expect(result[0].on).toBeUndefined();
  });

  it("should set table alias via TableDescription", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.INNER, { name: "orders", alias: "o" }, (on) => {
      on.where({ name: "user_id", table: "o" }, "=", { name: "id", table: "users" }, true);
    });

    const result = builder.build();
    expect(result[0].table).toEqual({ name: "orders", alias: "o" });
  });

  it("should build correct ON condition from callback", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.LEFT, { name: "orders" }, (on) => {
      on.where({ name: "user_id", table: "orders" }, "=", { name: "id", table: "users" }, true)
        .andWhere({ name: "status", table: "orders" }, "=", "active");
    });

    const result = builder.build();
    const onCondition = result[0].on;
    if (!onCondition) {
      throw new Error("ON condition should be defined");
    }
    expect(onCondition.conditionType).toBe(ConditionType.Group);
    if (onCondition.conditionType === ConditionType.Group) {
      expect(onCondition.conditions).toHaveLength(2);
    }
  });

  it("should accumulate multiple joins in order", () => {
    const builder = new JoinClauseBuilder();
    builder.add(JoinType.INNER, { name: "orders" }, (on) => {
      on.where({ name: "user_id", table: "orders" }, "=", { name: "id", table: "users" }, true);
    });
    builder.add(JoinType.LEFT, { name: "payments" }, (on) => {
      on.where({ name: "order_id", table: "payments" }, "=", { name: "id", table: "orders" }, true);
    });
    builder.add(JoinType.CROSS, { name: "settings" });

    const result = builder.build();
    expect(result).toHaveLength(3);
    expect(result[0].table.name).toBe("orders");
    expect(result[0].joinType).toBe(JoinType.INNER);
    expect(result[1].table.name).toBe("payments");
    expect(result[1].joinType).toBe(JoinType.LEFT);
    expect(result[2].table.name).toBe("settings");
    expect(result[2].joinType).toBe(JoinType.CROSS);
  });
});
