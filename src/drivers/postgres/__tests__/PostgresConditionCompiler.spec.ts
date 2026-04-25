import type { BaseCondition, ConditionGroup, RawCondition, SelectQuery } from "@/query-builder";
import { ClauseType, ConditionType, LogicalOperator, QueryType } from "@/query-builder";
import { createTestContext } from "@/drivers/postgres/__tests__/helpers";

const baseCond = (overrides: Partial<BaseCondition>): BaseCondition => ({
  type: ClauseType.Condition,
  conditionType: ConditionType.Base,
  left: { name: "id" },
  operator: "=",
  right: 1,
  ...overrides,
});

describe("PostgresConditionCompiler", () => {
  describe("BaseCondition", () => {
    it("compiles equality with a scalar parameter", () => {
      const { ctx, conditionCompiler, params } = createTestContext();
      const sql = conditionCompiler.compile(baseCond({ left: { name: "age" }, operator: "=", right: 30 }), ctx);
      expect(sql).toBe(`"age" = $1`);
      expect(params.getParams()).toEqual([30]);
    });

    it("compiles each comparison operator", () => {
      const ops: BaseCondition["operator"][] = ["<>", ">", "<", ">=", "<=", "LIKE", "NOT LIKE", "ILIKE", "NOT ILIKE"];
      for (const op of ops) {
        const { ctx, conditionCompiler } = createTestContext();
        const sql = conditionCompiler.compile(baseCond({ operator: op, right: "x" }), ctx);
        expect(sql).toBe(`"id" ${op} $1`);
      }
    });

    it("compiles IS NULL / IS NOT NULL with no RHS", () => {
      const { ctx, conditionCompiler, params } = createTestContext();
      expect(conditionCompiler.compile(baseCond({ operator: "IS NULL", right: null }), ctx)).toBe(`"id" IS NULL`);
      expect(conditionCompiler.compile(baseCond({ operator: "IS NOT NULL", right: null }), ctx)).toBe(`"id" IS NOT NULL`);
      expect(params.getParams()).toEqual([]);
    });

    it("compiles BETWEEN with two parameters", () => {
      const { ctx, conditionCompiler, params } = createTestContext();
      const sql = conditionCompiler.compile(baseCond({ operator: "BETWEEN", right: [10, 20] }), ctx);
      expect(sql).toBe(`"id" BETWEEN $1 AND $2`);
      expect(params.getParams()).toEqual([10, 20]);
    });

    it("compiles IN with an array of parameters", () => {
      const { ctx, conditionCompiler, params } = createTestContext();
      const sql = conditionCompiler.compile(baseCond({ operator: "IN", right: ["a", "b", "c"] }), ctx);
      expect(sql).toBe(`"id" IN ($1, $2, $3)`);
      expect(params.getParams()).toEqual(["a", "b", "c"]);
    });

    it("compiles empty IN as (NULL)", () => {
      const { ctx, conditionCompiler, params } = createTestContext();
      const sql = conditionCompiler.compile(baseCond({ operator: "IN", right: [] }), ctx);
      expect(sql).toBe(`"id" IN (NULL)`);
      expect(params.getParams()).toEqual([]);
    });

    it("compiles column-vs-column comparison", () => {
      const { ctx, conditionCompiler, params } = createTestContext();
      const sql = conditionCompiler.compile(
        baseCond({
          left: { name: "user_id", table: "orders" },
          operator: "=",
          right: { name: "id", table: "users" },
          isColumnComparison: true,
        }),
        ctx,
      );
      expect(sql).toBe(`"orders"."user_id" = "users"."id"`);
      expect(params.getParams()).toEqual([]);
    });

    it("compiles a SelectQuery on the RHS as a wrapped subquery", () => {
      const subquery: SelectQuery = {
        type: QueryType.SELECT,
        table: { name: "admins" },
        columns: [],
      };
      const { ctx, conditionCompiler } = createTestContext({
        compileSelect: (q) => `SELECT * FROM ${q.table.name}`,
      });
      const sql = conditionCompiler.compile(
        baseCond({ left: { name: "id" }, operator: "IN", right: subquery }),
        ctx,
      );
      expect(sql).toBe(`"id" IN (SELECT * FROM admins)`);
    });
  });

  describe("ConditionGroup", () => {
    it("joins conditions with their connectors and wraps in parens", () => {
      const group: ConditionGroup = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Group,
        conditions: [
          baseCond({ left: { name: "a" }, operator: "=", right: 1 }),
          baseCond({ left: { name: "b" }, operator: "=", right: 2, connector: LogicalOperator.AND }),
          baseCond({ left: { name: "c" }, operator: "=", right: 3, connector: LogicalOperator.OR }),
        ],
      };
      const { ctx, conditionCompiler, params } = createTestContext();
      expect(conditionCompiler.compile(group, ctx)).toBe(`("a" = $1 AND "b" = $2 OR "c" = $3)`);
      expect(params.getParams()).toEqual([1, 2, 3]);
    });

    it("compileTopLevel emits the group body without outer parens", () => {
      const group: ConditionGroup = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Group,
        conditions: [
          baseCond({ left: { name: "a" }, operator: "=", right: 1 }),
          baseCond({ left: { name: "b" }, operator: "=", right: 2, connector: LogicalOperator.AND }),
        ],
      };
      const { ctx, conditionCompiler } = createTestContext();
      expect(conditionCompiler.compileTopLevel(group, ctx)).toBe(`"a" = $1 AND "b" = $2`);
    });

    it("supports AND NOT and OR NOT connectors", () => {
      const group: ConditionGroup = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Group,
        conditions: [
          baseCond({ left: { name: "a" }, operator: "=", right: 1 }),
          baseCond({ left: { name: "b" }, operator: "=", right: 2, connector: LogicalOperator.AND_NOT }),
          baseCond({ left: { name: "c" }, operator: "=", right: 3, connector: LogicalOperator.OR_NOT }),
        ],
      };
      const { ctx, conditionCompiler } = createTestContext();
      expect(conditionCompiler.compileTopLevel(group, ctx)).toBe(
        `"a" = $1 AND NOT "b" = $2 OR NOT "c" = $3`,
      );
    });

    it("wraps nested groups in parens", () => {
      const inner: ConditionGroup = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Group,
        conditions: [
          baseCond({ left: { name: "x" }, operator: "=", right: 10 }),
          baseCond({ left: { name: "y" }, operator: "=", right: 20, connector: LogicalOperator.OR }),
        ],
      };
      const outer: ConditionGroup = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Group,
        conditions: [
          baseCond({ left: { name: "a" }, operator: "=", right: 1 }),
          { ...inner, connector: LogicalOperator.AND },
        ],
      };
      const { ctx, conditionCompiler } = createTestContext();
      expect(conditionCompiler.compileTopLevel(outer, ctx)).toBe(`"a" = $1 AND ("x" = $2 OR "y" = $3)`);
    });
  });

  describe("RawCondition", () => {
    it("substitutes ? placeholders with sequential dialect placeholders", () => {
      const raw: RawCondition = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Raw,
        sql: "age > ? AND status = ?",
        params: [18, "active"],
      };
      const { ctx, conditionCompiler, params } = createTestContext();
      expect(conditionCompiler.compile(raw, ctx)).toBe(`age > $1 AND status = $2`);
      expect(params.getParams()).toEqual([18, "active"]);
    });

    it("renumbers placeholders that share param indices with prior conditions", () => {
      const { ctx, conditionCompiler, params } = createTestContext();
      conditionCompiler.compile(baseCond({ left: { name: "a" }, operator: "=", right: 1 }), ctx);
      const raw: RawCondition = {
        type: ClauseType.Condition,
        conditionType: ConditionType.Raw,
        sql: "x > ?",
        params: [99],
      };
      expect(conditionCompiler.compile(raw, ctx)).toBe(`x > $2`);
      expect(params.getParams()).toEqual([1, 99]);
    });
  });
});
