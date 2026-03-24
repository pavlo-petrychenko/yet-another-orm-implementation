import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {PostgresParameterManager} from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import {PostgresConditionCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresConditonCompiler";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import {BaseCondition, ConditionGroup} from "@/query-builder/queries/common/WhereClause";

describe("PostgresConditionCompiler", () => {
    let paramManager: PostgresParameterManager;
    let dialectUtils: PostgresDialectUtils;
    let compiler: PostgresConditionCompiler;

    beforeEach(() => {
        let paramCounter = 1;

        paramManager = {
            getNextParameter: jest.fn(() => `$${paramCounter++}`)
        } as unknown as PostgresParameterManager;

        dialectUtils = {
            escapeIdentifier: jest.fn((col: ColumnDescription) => {
                const prefix = col.table ? `${col.table}.` : "";
                return `"${prefix}${col.name}"`;
            })
        } as unknown as PostgresDialectUtils;

        compiler = new PostgresConditionCompiler(paramManager, dialectUtils);
    });

    describe("compileBaseCondition", () => {
        it("should compile scalar condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "age" },
                operator: ">",
                right: 30,
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"age" > $1`,
                params: [30]
            });
        });

        it("should compile array condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "id" },
                operator: "IN",
                right: [1, 2, 3],
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"id" IN ($1, $2, $3)`,
                params: [1, 2, 3]
            });
        });

        it("should compile BETWEEN condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "age" },
                operator: "BETWEEN",
                right: [18, 65],
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"age" BETWEEN $1 AND $2`,
                params: [18, 65]
            });
        });

        it("should compile NOT BETWEEN condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "price" },
                operator: "NOT BETWEEN",
                right: [0, 10],
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"price" NOT BETWEEN $1 AND $2`,
                params: [0, 10]
            });
        });

        it("should compile IS NULL condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "deleted_at" },
                operator: "IS NULL",
                right: null as any,
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"deleted_at" IS NULL`,
                params: []
            });
        });

        it("should compile IS NOT NULL condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "email" },
                operator: "IS NOT NULL",
                right: null as any,
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"email" IS NOT NULL`,
                params: []
            });
        });

        it("should compile LIKE condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "name" },
                operator: "LIKE",
                right: "%john%",
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"name" LIKE $1`,
                params: ["%john%"]
            });
        });

        it("should compile ILIKE condition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "email" },
                operator: "ILIKE",
                right: "%@gmail%",
                isColumnComparison: false
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"email" ILIKE $1`,
                params: ["%@gmail%"]
            });
        });

        it("should compile condition with isColumnComparison = true", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "user_id" },
                operator: "=",
                right: { name: "owner_id" },
                isColumnComparison: true
            };

            const result = compiler["compileBaseCondition"](cond);

            expect(result).toEqual({
                sql: `"user_id" = "owner_id"`,
                params: []
            });
        });
    });

    describe("compileConditionGroup", () => {
        it("should compile simple group with AND", () => {
            const group: ConditionGroup = {
                type: "group",
                conditions: [
                    {
                        type: "condition",
                        left: { name: "name" },
                        operator: "=",
                        right: "Alice",
                        isColumnComparison: false
                    },
                    {
                        type: "condition",
                        left: { name: "age" },
                        operator: ">",
                        right: 25,
                        isColumnComparison: false,
                        connector: "AND"
                    }
                ]
            };

            const result = compiler["compileConditionGroup"](group);

            expect(result).toEqual({
                sql: `("name" = $1 AND "age" > $2)`,
                params: ["Alice", 25]
            });
        });

        it("should compile group with mixed connectors", () => {
            const group: ConditionGroup = {
                type: "group",
                conditions: [
                    {
                        type: "condition",
                        left: { name: "a" },
                        operator: "=",
                        right: 1,
                        isColumnComparison: false
                    },
                    {
                        type: "condition",
                        left: { name: "b" },
                        operator: "=",
                        right: 2,
                        isColumnComparison: false,
                        connector: "OR"
                    }
                ]
            };

            const result = compiler["compileConditionGroup"](group);

            expect(result).toEqual({
                sql: `("a" = $1 OR "b" = $2)`,
                params: [1, 2]
            });
        });

        it("should compile nested groups", () => {
            const group: ConditionGroup = {
                type: "group",
                conditions: [
                    {
                        type: "condition",
                        left: { name: "x" },
                        operator: "=",
                        right: 10,
                        isColumnComparison: false
                    },
                    {
                        type: "group",
                        connector: "AND",
                        conditions: [
                            {
                                type: "condition",
                                left: { name: "y" },
                                operator: "<",
                                right: 5,
                                isColumnComparison: false
                            },
                            {
                                type: "condition",
                                left: { name: "z" },
                                operator: ">",
                                right: 1,
                                isColumnComparison: false,
                                connector: "OR"
                            }
                        ]
                    }
                ]
            };

            const result = compiler["compileConditionGroup"](group);

            expect(result).toEqual({
                sql: `("x" = $1 AND ("y" < $2 OR "z" > $3))`,
                params: [10, 5, 1]
            });
        });

        it("should return empty group as empty SQL", () => {
            const group: ConditionGroup = {
                type: "group",
                conditions: []
            };

            const result = compiler["compileConditionGroup"](group);
            expect(result).toEqual({
                sql: `()`,
                params: []
            });
        });
    });

    describe("compile", () => {
        it("should delegate to compileBaseCondition", () => {
            const cond: BaseCondition = {
                type: "condition",
                left: { name: "x" },
                operator: "=",
                right: 42,
                isColumnComparison: false
            };

            const result = compiler.compile(cond);

            expect(result).toEqual({
                sql: `"x" = $1`,
                params: [42]
            });
        });

        it("should delegate to compileConditionGroup", () => {
            const group: ConditionGroup = {
                type: "group",
                conditions: [
                    {
                        type: "condition",
                        left: { name: "id" },
                        operator: "=",
                        right: 1,
                        isColumnComparison: false
                    }
                ]
            };

            const result = compiler.compile(group);

            expect(result).toEqual({
                sql: `("id" = $1)`,
                params: [1]
            });
        });
    });
});
