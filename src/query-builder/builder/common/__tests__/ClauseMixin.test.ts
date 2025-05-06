import { ClauseMixin } from "@/query-builder/builder/common/ClauseMixin";

describe("ClauseMixin", () => {
    class TestClauseBuilder extends ClauseMixin {}
    let builder: TestClauseBuilder;

    beforeEach(() => {
        builder = new TestClauseBuilder();
    });

    describe("groupBy()", () => {
        it("should add multiple group by columns", () => {
            builder.groupBy("col1", "col2");
            const result = builder["groupByBuilder"].build();
            expect(result).toEqual({
                type: "group_by",
                columns: [{ name: "col1" }, { name: "col2" }]
            });
        });

        it("should allow empty call without error", () => {
            builder.groupBy();
            const result = builder["groupByBuilder"].build();
            expect(result).toBeNull(); // based on your `|| undefined` logic
        });
    });

    describe("orderBy()", () => {
        it("should use default direction ASC", () => {
            builder.orderBy("col1");
            const result = builder["orderByBuilder"].build();
            expect(result).toEqual({
                type: "order_by",
                orders: [{ column: { name: "col1" }, direction: "ASC" }]
            });
        });

        it("should support DESC direction", () => {
            builder.orderBy("col1", "DESC");
            const result = builder["orderByBuilder"].build();
            expect(result).toEqual({
                type: "order_by",
                orders: [{ column: { name: "col1" }, direction: "DESC" }]
            });
        });
    });

    describe("joins", () => {
        const onCallback = (b: any) => b.where("a", "=", "b");

        it("should add innerJoin", () => {
            builder.innerJoin("table1", onCallback);
            const result = builder["joinBuilder"].build();
            expect(result[0]).toMatchObject({ type: "INNER", table: "table1" });
        });

        it("should add leftJoin", () => {
            builder.leftJoin("table2", onCallback);
            const result = builder["joinBuilder"].build();
            expect(result[0]).toMatchObject({ type: "LEFT", table: "table2" });
        });

        it("should add rightJoin", () => {
            builder.rightJoin("table3", onCallback);
            const result = builder["joinBuilder"].build();
            expect(result[0]).toMatchObject({ type: "RIGHT", table: "table3" });
        });

        it("should add fullJoin", () => {
            builder.fullJoin("table4", onCallback);
            const result = builder["joinBuilder"].build();
            expect(result[0]).toMatchObject({ type: "FULL", table: "table4" });
        });
    });

    describe("buildCommonClauses()", () => {
        it("should return empty when no clauses are set", () => {
            const result = builder["buildCommonClauses"]();
            // Match the actual object where all fields are undefined or empty
            expect(result).toEqual({
                where: undefined,
                groupBy: undefined,
                orderBy: undefined,
                limit: undefined,
                offset: undefined,
                join: []
            });
        });

        it("should return all clauses when all are set", () => {
            builder
                .where(b => b.where("x", "=", 1))
                .groupBy("g1")
                .orderBy("x", "DESC")
                .limit(2)
                .offset(4)
                .innerJoin("users", b => b.where("users.id", "=", "posts.user_id", true));

            const result = builder["buildCommonClauses"]();

            expect(result.where).toBeDefined();
            expect(result.groupBy).toBeDefined();
            expect(result.orderBy).toBeDefined();
            expect(result.limit).toBeDefined();
            expect(result.offset).toBeDefined();
            expect(result.join).toBeDefined();
        });
    });
});
