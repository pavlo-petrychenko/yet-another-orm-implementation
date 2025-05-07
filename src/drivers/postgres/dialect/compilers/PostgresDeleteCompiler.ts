// import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
// import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
// import {SQL} from "@/drivers/postgres/dialect/types/SQL";
// import {Query} from "@/query-builder/queries/Query";
import pino from "pino";
import {PostgresQueryCompiler} from "./common/PostgresQueryCompiler";
import {Query} from "../../../../query-builder/queries/Query";
import {CompiledQuery} from "../types/CompiledQuery";
import {SQL} from "../types/SQL";
// import {PostgresQueryCompiler} from "drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
// import {Query} from "query-builder/queries/Query";
// import {CompiledQuery} from "drivers/postgres/dialect/types/CompiledQuery";
// import {SQL} from "drivers/postgres/dialect/types/SQL";

/**
 * Compiler responsible for building DELETE SQL queries for PostgreSQL.
 */

export class PostgresDeleteCompiler extends PostgresQueryCompiler {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    /**
     * Compiles a high-level query description into a raw SQL DELETE statement with parameters.
     */
    compile(query: Query): CompiledQuery {
        const startTime = Date.now();
        // Log compilation details
        this.logger.debug(
            {query, timestamp: new Date().toISOString()},
            "Starting delete query compilation"
        );
        try {
            const parts: string[] = [SQL.DELETE];
            const params: any[] = [];

            if (query.type !== "DELETE") {
                const error = new Error(`Invalid query type ${query.type}`);
                this.logger.error(
                    {query, error: error.message, stack: error.stack},
                    "Delete query compilation failed: "
                );
                throw error;
            }

            this.addTable(parts, query.table);
            this.addWhereClause(parts, params, query.where);
            this.addReturningClause(parts, query.returning);
            this.addLimitClause(parts, params, query.limit);
            this.addOffsetClause(parts, params, query.offset);

            const duration = Date.now() - startTime;
            // Log timing information
            this.logger.debug("Compilation completed in %dms", duration);
            this.logger.debug(
                {sql: parts.join(" "), params, duration},
                "Delete query compiled successfully: "
            );
            return {sql: parts.join(" "), params};
        } catch (error) {
            if (error instanceof Error) {
                // Log error information
                this.logger.error(
                    {query, error: error.message, stack: error.stack},
                    "Failed to compile delete query: "
                );
                throw error;
            }
            throw new Error("Unknown error occurred during delete query compilation");
        }
    }
}