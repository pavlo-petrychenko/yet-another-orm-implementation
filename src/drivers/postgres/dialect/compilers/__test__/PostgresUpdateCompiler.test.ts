import { PostgresUpdateCompiler } from "@/drivers/postgres/dialect/compilers/PostgresUpdateCompiler";
import { Query } from "@/query-builder/queries/Query";
import { SQL } from "@/drivers/postgres/dialect/types/SQL";
import { PostgresDialectUtils } from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import { PostgresParameterManager } from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import { PostgresConditionCompiler } from "@/drivers/postgres/dialect/compilers/common/PostgresConditonCompiler";

describe("PostgresUpdateCompiler", () => {
    let compiler: PostgresUpdateCompiler;
    let mockDialectUtils: PostgresDialectUtils;
    let mockParamManager: PostgresParameterManager;
    let mockConditionCompiler: PostgresConditionCompiler;

    beforeEach(() => {
        // Mock the PostgresDialectUtils methods
        mockDialectUtils = {
            escapeIdentifier: jest.fn((x: string) => `"${x}"`), // real method behavior
        } as unknown as PostgresDialectUtils;

        // Mock the PostgresParameterManager methods
        mockParamManager = {
            getNextParameter: jest.fn(() => "$1"), // return the next parameter placeholder
        } as unknown as PostgresParameterManager;

        // Mock the PostgresConditionCompiler (though we might not use it in all tests)
        mockConditionCompiler = {
            compile: jest.fn(() => ({
                sql: '"id" = $1',
                params: [1],
            })),
        } as unknown as PostgresConditionCompiler;

        // Initialize the compiler with mocks
        compiler = new PostgresUpdateCompiler(
            mockParamManager,
            mockDialectUtils,
            mockConditionCompiler
        );
    });

    it("throws an error if query type is not UPDATE", () => {
        const query = {
            type: "SELECT",
            table: "users",
            values: {},
        } as any;

        expect(() => compiler.compile(query)).toThrowError("Invalid query type SELECT");
    });

    it("generates correct SQL and parameters for basic UPDATE", () => {
        const query: Query = {
            type: "UPDATE",
            table: "users",
            values: { name: "Bob", age: 30 },  // The query updates both name and age
            where: undefined,
            returning: undefined,
            limit: undefined,
            offset: undefined,
        };

        const result = compiler.compile(query);
        expect(result.sql).toContain("UPDATE \"users\" SET \"name\" = $1, \"age\" = $1");
        expect(result.params).toEqual(["Bob", 30]);
    });


    it("generates SQL without SET if values are undefined", () => {
        const query: Query = {
            type: "UPDATE",
            table: "users",
            values: undefined,
            where: undefined,
            returning: undefined,
            limit: undefined,
            offset: undefined,
        } as any;

        const result = compiler.compile(query);

        expect(result.sql).toContain(SQL.UPDATE);
        expect(result.sql).not.toContain("SET");
        expect(result.params).toEqual([]);
    });

    it("supports where clause and parameter accumulation", () => {
        const query: Query = {
            type: "UPDATE",
            table: "users",
            values: { name: "Bob" },
            where: {
                type: "condition", // match expected internal type
                operator: "=",
                left: "id",
                right: 1,
            } as any,
            returning: undefined,
            limit: undefined,
            offset: undefined,
        };

        // Stub addWhereClause to simulate appending SQL and parameters
        jest.spyOn(compiler as any, "addWhereClause").mockImplementation((parts: string[], params: any[], _where: any) => {
            parts.push(`WHERE "id" = $2`);
            params.push(1);
        });

        const result = compiler.compile(query);

        expect(result.sql).toMatch(/SET "name" = \$1/);
        expect(result.sql).toMatch(/WHERE "id" = \$2/);
        expect(result.params).toEqual(["Bob", 1]);
    });
});
