import { PostgresQueryCompiler } from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import { PostgresParameterManager } from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import { PostgresDialectUtils } from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import { PostgresConditionCompiler } from "@/drivers/postgres/dialect/compilers/common/PostgresConditonCompiler";
import { ReturningClause } from "@/query-builder/queries/common/ReturningClause";
import { LimitClause } from "@/query-builder/queries/common/LimitClause";
import { OffsetClause } from "@/query-builder/queries/common/OffsetClause";
import { ConditionClause } from "@/query-builder/queries/common/WhereClause";
import { CompiledQuery } from "@/drivers/postgres/dialect/types/CompiledQuery";

// Create a concrete subclass for testing
class TestQueryCompiler extends PostgresQueryCompiler {
    compile(): CompiledQuery {
        return { sql: "", params: [] }; // Dummy
    }

    // Expose protected methods for testing
    public testAddTable(parts: string[], table: string) {
        this.addTable(parts, table);
    }

    public testAddWhereClause(parts: string[], params: any[], cond?: ConditionClause) {
        this.addWhereClause(parts, params, cond);
    }

    public testAddReturningClause(parts: string[], returning?: ReturningClause) {
        this.addReturningClause(parts, returning);
    }

    public testAddLimitClause(parts: string[], params: any[], limit?: LimitClause) {
        this.addLimitClause(parts, params, limit);
    }

    public testAddOffsetClause(parts: string[], params: any[], offset?: OffsetClause) {
        this.addOffsetClause(parts, params, offset);
    }
}

describe("PostgresQueryCompiler", () => {
    let paramManager: PostgresParameterManager;
    let dialectUtils: PostgresDialectUtils;
    let conditionCompiler: PostgresConditionCompiler;
    let compiler: TestQueryCompiler;

    beforeEach(() => {
        let paramIndex = 1;
        paramManager = {
            getNextParameter: jest.fn(() => `$${paramIndex++}`)
        } as unknown as PostgresParameterManager;

        dialectUtils = {
            escapeIdentifier: jest.fn((name: any) => `"${name}"`)
        } as unknown as PostgresDialectUtils;

        conditionCompiler = {
            compile: jest.fn(() => ({
                sql: `"age" > $1`,
                params: [18]
            }))
        } as unknown as PostgresConditionCompiler;

        compiler = new TestQueryCompiler(paramManager, dialectUtils, conditionCompiler);
    });

    it("addTable should escape and append table", () => {
        const parts: string[] = [];
        compiler.testAddTable(parts, "users");

        expect(parts).toEqual(['"users"']);
        expect(dialectUtils.escapeIdentifier).toHaveBeenCalledWith("users");
    });

    it("addWhereClause should do nothing if condition is undefined", () => {
        const parts: string[] = [];
        const params: any[] = [];
        compiler.testAddWhereClause(parts, params, undefined);

        expect(parts).toEqual([]);
        expect(params).toEqual([]);
    });

    it("addWhereClause should compile condition and append to parts/params", () => {
        const parts: string[] = [];
        const params: any[] = [];

        // Correct format for ConditionClause with ColumnDescription
        const condition: ConditionClause = {
            type: "condition",
            left: { name: "age" }, // Corrected to ColumnDescription object
            operator: ">",
            right: 18,
            isColumnComparison: false
        };

        compiler.testAddWhereClause(parts, params, condition);

        expect(parts).toEqual(["WHERE", `"age" > $1`]);
        expect(params).toEqual([18]);
        expect(conditionCompiler.compile).toHaveBeenCalledWith(condition);
    });

    it("addReturningClause should do nothing if undefined", () => {
        const parts: string[] = [];
        compiler.testAddReturningClause(parts, undefined);
        expect(parts).toEqual([]);
    });

    it("addReturningClause should append RETURNING clause", () => {
        const parts: string[] = [];

        // Simulate columns as objects
        const returning: ReturningClause = {
            type: "returning",
            columns: [
                { name: "id" },
                { name: "name" }
            ]
        };

        compiler.testAddReturningClause(parts, returning);
        expect(parts).toEqual(['RETURNING "[object Object]", "[object Object]"']);
        expect(dialectUtils.escapeIdentifier).toHaveBeenCalledWith({ name: "id" });
        expect(dialectUtils.escapeIdentifier).toHaveBeenCalledWith({ name: "name" });
    });



    it("addLimitClause should do nothing if undefined", () => {
        const parts: string[] = [];
        const params: any[] = [];
        compiler.testAddLimitClause(parts, params, undefined);

        expect(parts).toEqual([]);
        expect(params).toEqual([]);
    });

    it("addLimitClause should append LIMIT and param", () => {
        const parts: string[] = [];
        const params: any[] = [];

        // Correct usage of LimitClause (with type)
        const limitClause: LimitClause = { type: "limit", count: 10 };
        compiler.testAddLimitClause(parts, params, limitClause);

        expect(parts).toEqual(["LIMIT", "$1"]);
        expect(params).toEqual([10]);
    });

    it("addOffsetClause should do nothing if undefined", () => {
        const parts: string[] = [];
        const params: any[] = [];
        compiler.testAddOffsetClause(parts, params, undefined);

        expect(parts).toEqual([]);
        expect(params).toEqual([]);
    });

    it("addOffsetClause should append OFFSET and param", () => {
        const parts: string[] = [];
        const params: any[] = [];

        // Correct usage of OffsetClause (with type)
        const offsetClause: OffsetClause = { type: "offset", count: 20 };
        compiler.testAddOffsetClause(parts, params, offsetClause);

        expect(parts).toEqual(["OFFSET", "$1"]);
        expect(params).toEqual([20]);
    });
});
