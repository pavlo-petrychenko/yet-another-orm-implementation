import { SelectQueryBuilder } from "../SelectQueryBuilder";
import { InsertQueryBuilder } from "../InsertQueryBuilder";
import { UpdateQueryBuilder } from "../UpdateQueryBuilder";
import { DeleteQueryBuilder } from "../DeleteQueryBuilder";
import { ConditionBuilder } from "../internal/ConditionBuilder";
import { OrderDirection } from "@/query-builder/types";
import { ClauseType } from "@/query-builder/types/clause/Clause";
import type { BaseCondition, ConditionGroup } from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import { JoinType } from "@/query-builder/types/clause/JoinClause/typedefs";

describe("Strict ColumnDescription / TableDescription typing", () => {
  // --- SelectQueryBuilder.from ---

  it('SelectQueryBuilder.from({ name: "users" }) sets table', () => {
    const query = new SelectQueryBuilder().from({ name: "users" }).build();
    expect(query.table).toEqual({ name: "users" });
  });

  it('SelectQueryBuilder.from({ name: "users", alias: "u" }) sets table with alias', () => {
    const query = new SelectQueryBuilder().from({ name: "users", alias: "u" }).build();
    expect(query.table).toEqual({ name: "users", alias: "u" });
    expect(query.tableAlias).toBe("u");
  });

  // --- SelectQueryBuilder.select ---

  it("SelectQueryBuilder.select with ColumnDescription objects", () => {
    const query = new SelectQueryBuilder()
      .from({ name: "users" })
      .select({ name: "id" }, { name: "email", alias: "mail" })
      .build();
    expect(query.columns).toEqual([
      { name: "id" },
      { name: "email", alias: "mail" },
    ]);
  });

  // --- InsertQueryBuilder.into ---

  it('InsertQueryBuilder.into({ name: "orders" }) sets table', () => {
    const query = new InsertQueryBuilder().into({ name: "orders" }).build();
    expect(query.table).toEqual({ name: "orders" });
  });

  // --- UpdateQueryBuilder.table ---

  it('UpdateQueryBuilder.table({ name: "products" }) sets table', () => {
    const query = new UpdateQueryBuilder().table({ name: "products" }).build();
    expect(query.table).toEqual({ name: "products" });
  });

  // --- DeleteQueryBuilder.from ---

  it('DeleteQueryBuilder.from({ name: "logs" }) sets table', () => {
    const query = new DeleteQueryBuilder().from({ name: "logs" }).build();
    expect(query.table).toEqual({ name: "logs" });
  });

  // --- .where with ColumnDescription ---

  it('.where({ name: "age", table: "users" }, ">", 18) uses ColumnDescription in condition', () => {
    const query = new SelectQueryBuilder()
      .from({ name: "users" })
      .where({ name: "age", table: "users" }, ">", 18)
      .build();
    const where = query.where as ConditionGroup;
    const cond = where.conditions[0] as BaseCondition;
    expect(cond.left).toEqual({ name: "age", table: "users" });
    expect(cond.operator).toBe(">");
    expect(cond.right).toBe(18);
  });

  // --- .orderBy with ColumnDescription + enum ---

  it('.orderBy({ name: "created_at" }, OrderDirection.DESC) uses ColumnDescription + enum', () => {
    const query = new SelectQueryBuilder()
      .from({ name: "users" })
      .orderBy({ name: "created_at" }, OrderDirection.DESC)
      .build();
    expect(query.orderBy).toEqual({
      type: ClauseType.OrderBy,
      orders: [{ column: { name: "created_at" }, direction: OrderDirection.DESC }],
    });
  });

  // --- .groupBy with ColumnDescription ---

  it('.groupBy({ name: "status" }) uses ColumnDescription', () => {
    const query = new SelectQueryBuilder()
      .from({ name: "users" })
      .groupBy({ name: "status" })
      .build();
    expect(query.groupBy).toEqual({
      type: ClauseType.GroupBy,
      columns: [{ name: "status" }],
    });
  });

  // --- .returning with ColumnDescription ---

  it('.returning({ name: "id" }) uses ColumnDescription', () => {
    const query = new SelectQueryBuilder()
      .from({ name: "users" })
      .returning({ name: "id" })
      .build();
    expect(query.returning).toEqual({
      type: ClauseType.Returning,
      columns: [{ name: "id" }],
    });
  });

  // --- .join with TableDescription ---

  it('.join({ name: "orders", alias: "o" }, ...) uses TableDescription in join', () => {
    const query = new SelectQueryBuilder()
      .from({ name: "users" })
      .join({ name: "orders", alias: "o" }, (on) =>
        on.where({ name: "id", table: "users" }, "=", { name: "user_id", table: "orders" }, true),
      )
      .build();
    const joins = query.join ?? [];
    expect(joins).toHaveLength(1);
    expect(joins[0].table).toEqual({ name: "orders", alias: "o" });
    expect(joins[0].joinType).toBe(JoinType.INNER);
  });

  // --- ConditionBuilder directly ---

  it('ConditionBuilder.where({ name: "col" }, "=", 1) uses ColumnDescription directly', () => {
    const builder = new ConditionBuilder();
    builder.where({ name: "col" }, "=", 1);
    const group = builder.build();
    expect(group.conditions).toHaveLength(1);
    const cond = group.conditions[0] as BaseCondition;
    expect(cond.left).toEqual({ name: "col" });
    expect(cond.right).toBe(1);
  });

  // --- Column comparison ---

  it('column comparison: .where({ name: "a" }, "=", { name: "b" }, true) both sides are ColumnDescription', () => {
    const builder = new ConditionBuilder();
    builder.where({ name: "a" }, "=", { name: "b" }, true);
    const group = builder.build();
    const cond = group.conditions[0] as BaseCondition;
    expect(cond.left).toEqual({ name: "a" });
    expect(cond.right).toEqual({ name: "b" });
    expect(cond.isColumnComparison).toBe(true);
  });
});
