import { JoinClauseBuilder } from "@/query-builder/builder/common/JoinClauseBuilder";
import { JoinClause } from "@/query-builder/queries/common/JoinClause";
import { ConditionClause } from "@/query-builder/queries/common/WhereClause";

describe("JoinClauseBuilder", () => {
    let builder: JoinClauseBuilder;

    beforeEach(() => {
        builder = new JoinClauseBuilder();
    });

    it("adds INNER JOIN with column comparison", () => {
        builder.join("users", b =>
            b.where("users.id", "=", "posts.user_id", true)
        );

        const result = builder.build();
        expect(result).toHaveLength(1);

        const join = result[0];
        expect(join.type).toBe("INNER");
        expect(join.table).toBe("users");

        const condition = join.on;
        expect(condition.type).toBe("group");

        if (condition.type === "group") {
            expect(condition.conditions).toHaveLength(1);
            expect(condition.conditions[0]).toMatchObject({
                type: "condition",
                left: { name: "users.id", alias: undefined },
                operator: "=",
                right: "posts.user_id",
                isColumnComparison: true,
                connector: "AND"
            });
        } else {
            throw new Error("Expected a group of conditions");
        }
    });


    it("adds LEFT JOIN", () => {
        builder.leftJoin("categories", b =>
            b.where("categories.id", "=", "posts.category_id", true)
        );

        const result = builder.build();
        expect(result[0]).toMatchObject({
            type: "LEFT",
            table: "categories"
        });
    });

    it("adds RIGHT JOIN", () => {
        builder.rightJoin("tags", b =>
            b.where("tags.id", "=", "post_tags.tag_id", true)
        );

        const result = builder.build();
        expect(result[0]).toMatchObject({
            type: "RIGHT",
            table: "tags"
        });
    });

    it("adds FULL JOIN", () => {
        builder.fullJoin("archive", b =>
            b.where("archive.post_id", "=", "posts.id", true)
        );

        const result = builder.build();
        expect(result[0]).toMatchObject({
            type: "FULL",
            table: "archive"
        });
    });

    it("supports multiple joins", () => {
        builder
            .join("users", b =>
                b.where("users.id", "=", "posts.user_id", true)
            )
            .leftJoin("categories", b =>
                b.where("categories.id", "=", "posts.category_id", true)
            );

        const result = builder.build();
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe("INNER");
        expect(result[1].type).toBe("LEFT");
    });

    it("returns empty array when no joins are added", () => {
        const result = builder.build();
        expect(result).toEqual([]);
    });
});
