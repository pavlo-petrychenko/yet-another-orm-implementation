import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
import {ConditionGroup} from "@/query-builder/queries/common/WhereClause";

describe("WhereClauseBuilder", () => {
    let builder: WhereClauseBuilder;

    beforeEach(() => {
        builder = new WhereClauseBuilder();
    });

    it("should add a basic where condition", () => {
        builder.where("age", ">", 18);
        const result = builder.build();
        expect(result.conditions).toHaveLength(1);
        expect(result.conditions[0]).toMatchObject({
            type: "condition",
            left: { name: "age", alias: undefined },
            operator: ">",
            right: 18,
            connector: "AND"
        });
    });

    it("should support alias in left column using 'AS'", () => {
        builder.where("u.age AS userAge", "<=", 30);
        const condition = builder.build().conditions[0];
        expect(condition).toMatchObject({
            left: { name: "u.age", alias: "userAge" }
        });
    });

    it("should support alias in left column using lowercase 'as'", () => {
        builder.where("u.age as userAge", "<=", 30);
        const condition = builder.build().conditions[0];
        expect(condition).toMatchObject({
            left: { name: "u.age", alias: "userAge" }
        });
    });

    it("should add multiple AND/OR conditions", () => {
        builder.where("age", ">", 18).orWhere("isAdmin", "=", "true");
        const [cond1, cond2] = builder.build().conditions as any;
        expect(cond1.connector).toBe("AND");
        expect(cond2.connector).toBe("OR");
    });

    it("should support NOT conditions", () => {
        builder.whereNot("deleted", "=", "false").orWhereNot("banned", "=", "true");
        const [cond1, cond2] = builder.build().conditions as any;
        expect(cond1.connector).toBe("AND NOT");
        expect(cond2.connector).toBe("OR NOT");
    });

    it("should support IN/NOT IN conditions", () => {
        builder.whereIn("id", [1, 2, 3]).whereNotIn("status", ["inactive"]);
        const [cond1, cond2] = builder.build().conditions as any;
        expect(cond1).toMatchObject({ operator: "IN", right: [1, 2, 3] });
        expect(cond2).toMatchObject({ operator: "NOT IN", right: ["inactive"] });
    });

    it("should support OR IN / OR NOT IN", () => {
        builder.orWhereIn("type", ["A", "B"]).orWhereNotIn("role", ["guest"]);
        const [cond1, cond2] = builder.build().conditions as any;
        expect(cond1.connector).toBe("OR");
        expect(cond2.connector).toBe("OR");
    });

    it("should support column-to-column comparison", () => {
        builder.where("createdAt", "=", "updatedAt", true);
        const result = builder.build();
        expect(result.conditions[0]).toMatchObject({
            isColumnComparison: true,
            right: "updatedAt"
        });
    });

    it("should support grouping conditions", () => {
        builder.where("age", ">", 18).group("OR", g => {
            g.where("isAdmin", "=", "true").orWhere("isManager", "=", "true");
        });

        const result = builder.build();
        expect(result.conditions).toHaveLength(2);
        const group = result.conditions[1] as ConditionGroup;
        expect(group.type).toBe("group");
        expect(group.connector).toBe("OR");
        expect(group.conditions).toHaveLength(2);
    });

    it("should support nested groups", () => {
        builder.group("AND", g => {
            g.group("OR", g2 => {
                g2.where("a", "=", 1).orWhere("b", "=", 2);
            });
        });

        const root = builder.build();
        const level1 = root.conditions[0] as ConditionGroup;
        const level2 = level1.conditions[0] as ConditionGroup;

        expect(level1.type).toBe("group");
        expect(level2.type).toBe("group");
        expect(level2.conditions).toHaveLength(2);
    });

    it("should support LIKE conditions", () => {
        builder.whereLike("name", "%john%");
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({
            operator: "LIKE",
            right: "%john%",
            connector: "AND"
        });
    });

    it("should support OR LIKE conditions", () => {
        builder.where("id", "=", 1).orWhereLike("name", "%doe%");
        const cond = builder.build().conditions[1] as any;
        expect(cond).toMatchObject({ operator: "LIKE", connector: "OR" });
    });

    it("should support NOT LIKE conditions", () => {
        builder.whereNotLike("name", "%test%");
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({ operator: "NOT LIKE" });
    });

    it("should support ILIKE conditions", () => {
        builder.whereILike("email", "%@GMAIL%");
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({ operator: "ILIKE" });
    });

    it("should support BETWEEN conditions", () => {
        builder.whereBetween("age", 18, 65);
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({
            operator: "BETWEEN",
            right: [18, 65],
            connector: "AND"
        });
    });

    it("should support OR BETWEEN conditions", () => {
        builder.where("id", "=", 1).orWhereBetween("score", 0, 100);
        const cond = builder.build().conditions[1] as any;
        expect(cond).toMatchObject({ operator: "BETWEEN", connector: "OR" });
    });

    it("should support NOT BETWEEN conditions", () => {
        builder.whereNotBetween("price", 0, 10);
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({ operator: "NOT BETWEEN", right: [0, 10] });
    });

    it("should support IS NULL conditions", () => {
        builder.whereNull("deleted_at");
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({
            operator: "IS NULL",
            left: { name: "deleted_at" },
            connector: "AND"
        });
    });

    it("should support IS NOT NULL conditions", () => {
        builder.whereNotNull("email");
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({
            operator: "IS NOT NULL",
            left: { name: "email" },
            connector: "AND"
        });
    });

    it("should support OR IS NULL conditions", () => {
        builder.where("id", "=", 1).orWhereNull("name");
        const cond = builder.build().conditions[1] as any;
        expect(cond).toMatchObject({ operator: "IS NULL", connector: "OR" });
    });

    it("should support whereIn with subquery callback", () => {
        builder.whereIn("id", (qb: any) =>
            qb.from("orders").select("user_id")
        );
        const cond = builder.build().conditions[0] as any;
        expect(cond.operator).toBe("IN");
        expect(cond.right).toMatchObject({
            type: "SELECT",
            table: "orders",
        });
        expect(cond.right.columns).toEqual([
            { name: "user_id", alias: undefined, table: "orders" }
        ]);
    });

    it("should support whereNotIn with subquery callback", () => {
        builder.whereNotIn("id", (qb: any) =>
            qb.select("user_id").from("banned")
        );
        const cond = builder.build().conditions[0] as any;
        expect(cond.operator).toBe("NOT IN");
        expect(cond.right.type).toBe("SELECT");
    });

    it("should support whereRaw", () => {
        builder.whereRaw("age > 18 AND verified = true");
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({
            type: "raw_condition",
            sql: "age > 18 AND verified = true",
            params: [],
            connector: "AND"
        });
    });

    it("should support whereRaw with params", () => {
        builder.whereRaw("score > $1", [100]);
        const cond = builder.build().conditions[0] as any;
        expect(cond).toMatchObject({
            type: "raw_condition",
            sql: "score > $1",
            params: [100],
            connector: "AND"
        });
    });

    it("should support orWhereRaw", () => {
        builder.where("id", "=", 1).orWhereRaw("name ILIKE '%test%'");
        const cond = builder.build().conditions[1] as any;
        expect(cond).toMatchObject({
            type: "raw_condition",
            connector: "OR"
        });
    });

    it("should return empty group if no condition added", () => {
        const result = builder.build();
        expect(result).toEqual({
            type: "group",
            conditions: [],
            connector: "AND"
        });
    });
});
