import {Dialect} from "@/drivers/common/Dialect";
import {PostgresParameterManager} from "./utils/PostgresParameterManager";
import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {Query} from "@/query-builder/queries/Query";
import {PostgresSelectCompiler} from "@/drivers/postgres/dialect/compilers/PostgresSelectCompiler";
import {PostgresInsertCompiler} from "@/drivers/postgres/dialect/compilers/PostgresInsertCompiler";
import {PostgresUpdateCompiler} from "@/drivers/postgres/dialect/compilers/PostgresUpdateCompiler";
import {PostgresDeleteCompiler} from "@/drivers/postgres/dialect/compilers/PostgresDeleteCompiler";
import {PostgresConditionCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresConditonCompiler";

/**
 * The `PostgresDialect` class implements the `Dialect` interface,
 * providing SQL query generation specifically for PostgreSQL databases.
 *
 * This class follows the Strategy pattern, encapsulating PostgreSQL-specific
 * behaviors for compiling various SQL query types (SELECT, INSERT, UPDATE, DELETE).
 *
 * It also uses a centralized parameter manager and utility methods to ensure
 * safe and consistent SQL generation.
 */
export class PostgresDialect implements Dialect {
    /** Manages parameter placeholders for PostgreSQL queries (e.g., $1, $2, ...) */
    private paramManager = new PostgresParameterManager();
    /** Utility methods for escaping identifiers and other PostgreSQL-specific operations */
    private dialectUtils = new PostgresDialectUtils();
    /** Holds query compilers for each supported query type */
    private queryCompilers: Map<string, PostgresQueryCompiler>;
    /** Compiler for SQL conditions used in WHERE, JOIN ON, etc. */


    private conditionCompiler = new PostgresConditionCompiler(this.paramManager, this.dialectUtils)

    /**
     *
     * Initializes the dialect by registering all supported query compilers.
     *
     */
    constructor() {
        this.initializeQueryCompilers();
    }


    buildQuery(query: Query): CompiledQuery {
        this.paramManager.reset();

        const compiler = this.queryCompilers.get(query.type)
        if (!compiler) {
            throw new Error(`Unknown query type: ${query.type}`);
        }

        return compiler.compile(query)
    }

    private initializeQueryCompilers(): void {
        this.queryCompilers = new Map<string, PostgresQueryCompiler>([
            ['SELECT', new PostgresSelectCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)],
            ['INSERT', new PostgresInsertCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)],
            ['UPDATE', new PostgresUpdateCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)],
            ['DELETE', new PostgresDeleteCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)]
        ]);

    }


}