import { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
import { ClauseType } from "@/query-builder/types/clause/Clause";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";
import type {
  BaseCondition,
  ConditionGroup,
  RawCondition,
} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import { LogicalOperator } from "@/query-builder/types/common/LogicalOperator";

describe("ConditionBuilder", () => {
  let builder: ConditionBuilder;

  beforeEach(() => {
    builder = new ConditionBuilder();
  });

  describe("base conditions", () => {
    it("single .where() produces one BaseCondition", () => {
      const result = builder.where({ name: "age" }, "=", 18).build();

      expect(result.conditions).toHaveLength(1);
      const cond = result.conditions[0] as BaseCondition;
      expect(cond.type).toBe(ClauseType.Condition);
      expect(cond.conditionType).toBe(ConditionType.Base);
      expect(cond.left).toEqual({ name: "age" });
      expect(cond.operator).toBe("=");
      expect(cond.right).toBe(18);
      expect(cond.connector).toBeUndefined();
    });

    it(".where().andWhere() chain produces two conditions with correct connectors", () => {
      const result = builder
        .where({ name: "age" }, ">", 18)
        .andWhere({ name: "name" }, "=", "John")
        .build();

      expect(result.conditions).toHaveLength(2);
      expect((result.conditions[0] as BaseCondition).connector).toBeUndefined();
      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.AND);
    });

    it(".orWhere() sets LogicalOperator.OR connector", () => {
      const result = builder
        .where({ name: "age" }, ">", 18)
        .orWhere({ name: "status" }, "=", "active")
        .build();

      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.OR);
    });

    it(".whereNot() sets LogicalOperator.AND_NOT", () => {
      const result = builder
        .where({ name: "age" }, ">", 18)
        .whereNot({ name: "status" }, "=", "banned")
        .build();

      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.AND_NOT);
    });

    it(".orWhereNot() sets LogicalOperator.OR_NOT", () => {
      const result = builder
        .where({ name: "age" }, ">", 18)
        .orWhereNot({ name: "status" }, "=", "banned")
        .build();

      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.OR_NOT);
    });
  });

  describe("convenience conditions", () => {
    it('.whereIn({ name: "col" }, [1,2,3]) produces condition with operator "IN" and array right', () => {
      const result = builder.whereIn({ name: "col" }, [1, 2, 3]).build();

      const cond = result.conditions[0] as BaseCondition;
      expect(cond.operator).toBe("IN");
      expect(cond.right).toEqual([1, 2, 3]);
    });

    it('.whereNotIn() produces operator "NOT IN"', () => {
      const result = builder.whereNotIn({ name: "col" }, [1, 2]).build();

      expect((result.conditions[0] as BaseCondition).operator).toBe("NOT IN");
    });

    it('.whereLike({ name: "col" }, "%pattern%") produces condition with operator "LIKE"', () => {
      const result = builder.whereLike({ name: "col" }, "%pattern%").build();

      const cond = result.conditions[0] as BaseCondition;
      expect(cond.operator).toBe("LIKE");
      expect(cond.right).toBe("%pattern%");
    });

    it('.whereILike() produces operator "ILIKE"', () => {
      const result = builder.whereILike({ name: "col" }, "%test%").build();

      expect((result.conditions[0] as BaseCondition).operator).toBe("ILIKE");
    });

    it('.whereNotLike() produces operator "NOT LIKE"', () => {
      const result = builder.whereNotLike({ name: "col" }, "%x%").build();

      expect((result.conditions[0] as BaseCondition).operator).toBe("NOT LIKE");
    });

    it('.whereNotILike() produces operator "NOT ILIKE"', () => {
      const result = builder.whereNotILike({ name: "col" }, "%x%").build();

      expect((result.conditions[0] as BaseCondition).operator).toBe("NOT ILIKE");
    });

    it('.whereBetween({ name: "col" }, 1, 10) produces condition with operator "BETWEEN" and right [1, 10]', () => {
      const result = builder.whereBetween({ name: "col" }, 1, 10).build();

      const cond = result.conditions[0] as BaseCondition;
      expect(cond.operator).toBe("BETWEEN");
      expect(cond.right).toEqual([1, 10]);
    });

    it('.whereNotBetween() produces operator "NOT BETWEEN"', () => {
      const result = builder.whereNotBetween({ name: "col" }, 1, 10).build();

      expect((result.conditions[0] as BaseCondition).operator).toBe("NOT BETWEEN");
    });

    it('.whereNull({ name: "col" }) produces condition with operator "IS NULL" and right null', () => {
      const result = builder.whereNull({ name: "col" }).build();

      const cond = result.conditions[0] as BaseCondition;
      expect(cond.operator).toBe("IS NULL");
      expect(cond.right).toBeNull();
    });

    it('.whereNotNull({ name: "col" }) produces operator "IS NOT NULL"', () => {
      const result = builder.whereNotNull({ name: "col" }).build();

      const cond = result.conditions[0] as BaseCondition;
      expect(cond.operator).toBe("IS NOT NULL");
      expect(cond.right).toBeNull();
    });

    it(".orWhereIn() uses OR connector", () => {
      const result = builder.where({ name: "x" }, "=", 1).orWhereIn({ name: "col" }, [1, 2]).build();

      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.OR);
    });

    it(".orWhereBetween() uses OR connector", () => {
      const result = builder.where({ name: "x" }, "=", 1).orWhereBetween({ name: "col" }, 1, 10).build();

      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.OR);
    });

    it(".orWhereNull() uses OR connector", () => {
      const result = builder.where({ name: "x" }, "=", 1).orWhereNull({ name: "col" }).build();

      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.OR);
    });

    it(".orWhereNotNull() uses OR connector", () => {
      const result = builder.where({ name: "x" }, "=", 1).orWhereNotNull({ name: "col" }).build();

      expect((result.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.OR);
    });
  });

  describe("raw conditions", () => {
    it('.whereRaw("age > $1", [18]) produces RawCondition with correct sql/params', () => {
      const result = builder.whereRaw("age > $1", [18]).build();

      const cond = result.conditions[0] as RawCondition;
      expect(cond.conditionType).toBe(ConditionType.Raw);
      expect(cond.sql).toBe("age > $1");
      expect(cond.params).toEqual([18]);
    });

    it(".orWhereRaw() uses OR connector", () => {
      const result = builder
        .where({ name: "x" }, "=", 1)
        .orWhereRaw("age > $1", [18])
        .build();

      expect((result.conditions[1] as RawCondition).connector).toBe(LogicalOperator.OR);
    });

    it(".whereRaw() defaults params to empty array", () => {
      const result = builder.whereRaw("1 = 1").build();

      expect((result.conditions[0] as RawCondition).params).toEqual([]);
    });
  });

  describe("grouping", () => {
    it("group() produces nested ConditionGroup", () => {
      const result = builder
        .where({ name: "active" }, "=", 1)
        .group(LogicalOperator.OR, (w) => {
          w.where({ name: "age" }, ">", 18);
          w.andWhere({ name: "age" }, "<", 65);
        })
        .build();

      expect(result.conditions).toHaveLength(2);
      const group = result.conditions[1] as ConditionGroup;
      expect(group.conditionType).toBe(ConditionType.Group);
      expect(group.connector).toBe(LogicalOperator.OR);
      expect(group.conditions).toHaveLength(2);
      expect((group.conditions[0] as BaseCondition).left).toEqual({ name: "age" });
      expect((group.conditions[1] as BaseCondition).connector).toBe(LogicalOperator.AND);
    });
  });

  describe("column comparison", () => {
    it("isColumnComparison: true sets the flag and uses right as ColumnDescription", () => {
      const result = builder.where({ name: "id", table: "a" }, "=", { name: "id", table: "b" }, true).build();

      const cond = result.conditions[0] as BaseCondition;
      expect(cond.isColumnComparison).toBe(true);
      expect(cond.left).toEqual({ name: "id", table: "a" });
      expect(cond.right).toEqual({ name: "id", table: "b" });
    });
  });

  describe("empty builder", () => {
    it("build() returns ConditionGroup with empty conditions array", () => {
      const result = builder.build();

      expect(result.type).toBe(ClauseType.Condition);
      expect(result.conditionType).toBe(ConditionType.Group);
      expect(result.conditions).toEqual([]);
    });
  });

  describe("chaining", () => {
    it("all methods return this", () => {
      const a = { name: "a" };
      expect(builder.where(a, "=", 1)).toBe(builder);
      expect(builder.andWhere(a, "=", 1)).toBe(builder);
      expect(builder.orWhere(a, "=", 1)).toBe(builder);
      expect(builder.whereNot(a, "=", 1)).toBe(builder);
      expect(builder.orWhereNot(a, "=", 1)).toBe(builder);
      expect(builder.whereIn(a, [1])).toBe(builder);
      expect(builder.whereNotIn(a, [1])).toBe(builder);
      expect(builder.orWhereIn(a, [1])).toBe(builder);
      expect(builder.orWhereNotIn(a, [1])).toBe(builder);
      expect(builder.whereLike(a, "%")).toBe(builder);
      expect(builder.orWhereLike(a, "%")).toBe(builder);
      expect(builder.whereNotLike(a, "%")).toBe(builder);
      expect(builder.whereILike(a, "%")).toBe(builder);
      expect(builder.orWhereILike(a, "%")).toBe(builder);
      expect(builder.whereNotILike(a, "%")).toBe(builder);
      expect(builder.whereBetween(a, 1, 2)).toBe(builder);
      expect(builder.orWhereBetween(a, 1, 2)).toBe(builder);
      expect(builder.whereNotBetween(a, 1, 2)).toBe(builder);
      expect(builder.orWhereNotBetween(a, 1, 2)).toBe(builder);
      expect(builder.whereNull(a)).toBe(builder);
      expect(builder.orWhereNull(a)).toBe(builder);
      expect(builder.whereNotNull(a)).toBe(builder);
      expect(builder.orWhereNotNull(a)).toBe(builder);
      expect(builder.whereRaw("1=1")).toBe(builder);
      expect(builder.orWhereRaw("1=1")).toBe(builder);
    });
  });

  describe("table-qualified columns", () => {
    it("accepts ColumnDescription with table field", () => {
      const result = builder.where({ name: "age", table: "users" }, ">", 18).build();

      const cond = result.conditions[0] as BaseCondition;
      expect(cond.left).toEqual({ name: "age", table: "users" });
    });
  });
});
