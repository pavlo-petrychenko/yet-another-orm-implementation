// import { WhereClauseBuilder } from "@/query-builder/builder/common/WhereClauseBuilder";
// import { ConditionGroup } from "@/query-builder/queries/common/WhereClause";

// import {WhereClauseBuilder} from "query-builder/builder/common/WhereClauseBuilder";
// import {ConditionGroup} from "query-builder/queries/common/WhereClause";

import {WhereClauseBuilder} from "../WhereClauseBuilder";
import {ConditionGroup} from "../../../queries/common/WhereClause";

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

    it("should return empty group if no condition added", () => {
        const result = builder.build();
        expect(result).toEqual({
            type: "group",
            conditions: [],
            connector: "AND"
        });
    });
});
