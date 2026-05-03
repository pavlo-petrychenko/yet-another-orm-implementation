import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { EntityMetadata } from "@/metadata/types";
import { defaultMetadataStorage } from "@/metadata/storage";
import { ModelError } from "@/model/errors/ModelError";
import { compileWhere } from "@/model/internal/compileWhere";
import { ConditionBuilder } from "@/query-builder/builders/internal/ConditionBuilder";
import type {
  BaseCondition,
  ConditionGroup,
} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";
import { LogicalOperator } from "@/query-builder/types/common/LogicalOperator";

describe("compileWhere", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
  });

  function buildFixture(): { meta: EntityMetadata } {
    @Entity({ name: "users" })
    class User {
      @PrimaryKey({ type: "integer" })
      public id!: number;

      @Column({ type: "string", name: "display_name" })
      public displayName!: string;

      @Column({ type: "integer" })
      public age!: number;

      @Column({ type: "boolean", name: "is_active" })
      public isActive!: boolean;

      @Column({ type: "timestamptz", name: "last_login_at", nullable: true })
      public lastLoginAt!: Date | null;
    }
    const meta = defaultMetadataStorage.getEntity(User);
    if (!meta) throw new Error("metadata missing");
    return { meta };
  }

  it("bare scalar value compiles to '=' condition", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ id: 1 }, meta, builder);

    const cond = builder.build().conditions[0] as BaseCondition;
    expect(cond.left).toEqual({ name: "id", table: "users" });
    expect(cond.operator).toBe("=");
    expect(cond.right).toBe(1);
  });

  it("null value compiles to IS NULL", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ lastLoginAt: null }, meta, builder);

    const cond = builder.build().conditions[0] as BaseCondition;
    expect(cond.operator).toBe("IS NULL");
  });

  it("$isNull: false compiles to IS NOT NULL", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ lastLoginAt: { $isNull: false } }, meta, builder);

    expect((builder.build().conditions[0] as BaseCondition).operator).toBe("IS NOT NULL");
  });

  it("operator object maps to comparison operators", () => {
    const { meta } = buildFixture();
    const cases: Array<[string, string]> = [
      ["$eq", "="],
      ["$ne", "<>"],
      ["$gt", ">"],
      ["$lt", "<"],
      ["$gte", ">="],
      ["$lte", "<="],
      ["$like", "LIKE"],
      ["$ilike", "ILIKE"],
    ];
    for (const [opKey, sqlOp] of cases) {
      const builder = new ConditionBuilder();
      compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ age: { [opKey]: 18 } } as never, meta, builder);
      expect((builder.build().conditions[0] as BaseCondition).operator).toBe(sqlOp);
    }
  });

  it("$in / $nin compile to IN / NOT IN", () => {
    const { meta } = buildFixture();
    const inBuilder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ id: { $in: [1, 2, 3] } }, meta, inBuilder);
    expect((inBuilder.build().conditions[0] as BaseCondition).operator).toBe("IN");

    const ninBuilder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ id: { $nin: [4, 5] } }, meta, ninBuilder);
    expect((ninBuilder.build().conditions[0] as BaseCondition).operator).toBe("NOT IN");
  });

  it("sibling fields are AND-combined", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ id: 1, isActive: true }, meta, builder);

    const conditions = builder.build().conditions;
    expect(conditions).toHaveLength(2);
    expect((conditions[0] as BaseCondition).connector).toBeUndefined();
    expect((conditions[1] as BaseCondition).connector).toBe(LogicalOperator.AND);
  });

  it("$or wraps siblings in an OR group", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ $or: [{ id: 1 }, { id: 2 }] }, meta, builder);

    const top = builder.build().conditions[0] as ConditionGroup;
    expect(top.conditionType).toBe(ConditionType.Group);
    expect(top.conditions).toHaveLength(2);
    expect((top.conditions[0] as ConditionGroup).conditionType).toBe(ConditionType.Group);
    expect((top.conditions[1] as ConditionGroup).connector).toBe(LogicalOperator.OR);
  });

  it("$not wraps a sub-where in a NOT group", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ $not: { isActive: true } }, meta, builder);

    const top = builder.build().conditions[0] as ConditionGroup;
    expect(top.conditionType).toBe(ConditionType.Group);
    expect(top.connector).toBe(LogicalOperator.AND_NOT);
  });

  it("$and composes multiple sub-clauses", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ $and: [{ id: 1 }, { age: { $gt: 18 } }] }, meta, builder);

    const conditions = builder.build().conditions;
    expect(conditions).toHaveLength(2);
    expect((conditions[0] as ConditionGroup).conditionType).toBe(ConditionType.Group);
    expect((conditions[1] as ConditionGroup).conditionType).toBe(ConditionType.Group);
  });

  it("property name maps to column name (displayName → display_name)", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ displayName: "Alice" }, meta, builder);

    const cond = builder.build().conditions[0] as BaseCondition;
    expect(cond.left).toEqual({ name: "display_name", table: "users" });
  });

  it("unknown property throws ModelError(UNKNOWN_PROPERTY)", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    expect(() => {
      compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({ noSuch: 1 } as never, meta, builder);
    }).toThrow(ModelError);
  });

  it("empty where compiles to no conditions", () => {
    const { meta } = buildFixture();
    const builder = new ConditionBuilder();
    compileWhere<{ id: number; displayName: string; age: number; isActive: boolean; lastLoginAt: Date | null }>({}, meta, builder);
    expect(builder.build().conditions).toHaveLength(0);
  });
});
