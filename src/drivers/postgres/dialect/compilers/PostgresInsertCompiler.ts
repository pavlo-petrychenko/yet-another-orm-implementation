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
 * Responsible for compiling INSERT queries for PostgreSQL.
 */
export class PostgresInsertCompiler extends PostgresQueryCompiler {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    /**
     * Compiles an INSERT query into a parameterized SQL statement.
     * @param query The abstract query description to compile.
     * @returns Compiled SQL string with its parameters.
     */
    compile(query: Query): CompiledQuery {
        const startTime = Date.now();
        // Log compilation details
        this.logger.debug(
            {query, timestamp: new Date().toISOString()},
            "Starting insert query compilation"
        );

        try {
            const parts: string[] = [SQL.INSERT];
            const params: any[] = [];
            if (query.type !== "INSERT") {
                const error = new Error(`Invalid query type ${query.type}`);
                this.logger.error(
                    {query, error: error.message, stack: error.stack},
                    "Insert query compilation failed: "
                );
                throw error;
            }

            this.addTable(parts, query.table);
            this.addValues(parts, params, query.values);
            this.addReturningClause(parts, query.returning);
            this.addLimitClause(parts, params, query.limit);
            this.addOffsetClause(parts, params, query.offset);

            const duration = Date.now() - startTime;
            // Log timing information
            this.logger.debug("Compilation completed in %dms", duration);
            this.logger.debug(
                {sql: parts.join(" "), params, duration},
                "Insert query compiled successfully: "
            );
            return {sql: parts.join(" "), params};
        } catch (error) {
            if (error instanceof Error) {
                // Log error information
                this.logger.error(
                    {query, error: error.message, stack: error.stack},
                    "Failed to compile insert query: "
                );
                throw error;
            }
            throw new Error("Unknown error occurred during insert query compilation");
        }
    }

    /**
     * Compiles an INSERT query into a parameterized SQL statement.
     * @param query The abstract query description to compile.
     * @returns Compiled SQL string with its parameters.
     */
    private addValues(
        parts: string[],
        params: any[],
        values: Record<string, any> | undefined
    ): void {
        if (!values) {
            this.logger.debug("No values provided for INSERT");
            return;
        }
        this.logger.debug({values}, "Adding values to INSERT query");

        parts.push('(')
        parts.push(Object.keys(values).join(', '))
        parts.push(')')

        parts.push('VALUES', '(');
        parts.push(Object.values(values).map(v => this.paramManager.getNextParameter()).join(', '));
        parts.push(')');
        params.push(...Object.values(values));
    
    }
}
