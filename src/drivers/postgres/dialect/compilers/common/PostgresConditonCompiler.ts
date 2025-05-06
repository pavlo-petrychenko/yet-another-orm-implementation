import {PostgresParameterManager} from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {
    BaseCondition,
    ConditionClause,
    ConditionGroup,
} from "@/query-builder/queries/common/WhereClause";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import pino from "pino";

/**
 * Responsible for compiling WHERE conditions into SQL strings and parameters for PostgreSQL.
 */
export class PostgresConditionCompiler {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    constructor(
        private paramManager: PostgresParameterManager,
        private dialectUtils: PostgresDialectUtils
    ) {
    }

    /**
     * Main entry point for compiling any condition clause.
     */
    compile(condition: ConditionClause): CompiledQuery {
        const startTime = Date.now();
        // Log compilation details
        this.logger.debug(
            {condition, timestamp: new Date().toISOString()},
            "Starting compilation"
        );

        try {
            const result =
                condition.type === "condition"
                    ? this.compileBaseCondition(condition)
                    : this.compileConditionGroup(condition as ConditionGroup);

            const duration = Date.now() - startTime;
            // Log timing information
            this.logger.debug("Compilation completed in %dms", duration);
            this.logger.debug({sql: result.sql, duration}, "Compilation result: ");
            return result;
        } catch (error) {
            if (error instanceof Error) {
                // Log error information
                this.logger.error(
                    {condition, error: error.message, stack: error.stack},
                    "Compilation failed: "
                );
                throw error;
            }
            throw new Error("Unknown error occurred during compilation");
        }
    }

    /**
     * Main entry point for compiling any condition clause.
     */
    private compileConditionGroup(condition: ConditionGroup): CompiledQuery {
        const startTime = Date.now();
        // Log compilation details
        this.logger.debug(
            {condition, timestamp: new Date().toISOString()},
            "Compiling condition group"
        );

        try {
            const {conditions} = condition;
            const parts: string[] = [];
            const allParams: any[] = [];
            for (let i = 0; i < conditions.length; i++) {
                const cond = conditions[i];
                const compiled = this.compile(cond);

                const prefix = i === 0 ? "" : ` ${cond.connector ?? "AND"} `;

                parts.push(prefix + compiled.sql);
                allParams.push(...compiled.params);
            }

            const duration = Date.now() - startTime;
            // Log timing information
            this.logger.debug("Compilation completed in %dms", duration);
            this.logger.debug(
                {sql: `(${parts.join("")})`, params: allParams, duration},
                "Condition group compiled: "
            );

            return {
                sql: `(${parts.join("")})`,
                params: allParams,
            };
        } catch (error) {
            if (error instanceof Error) {
                // Log error information
                this.logger.error(
                    {condition, error: error.message, stack: error.stack},
                    "Error compiling condition group: "
                );
                throw error;
            }
            throw new Error("Unknown error occurred during compilation");
        }
    }

    /**
     * Compiles a single base condition into SQL with parameter(s).
     */
    private compileBaseCondition(cond: BaseCondition): CompiledQuery {
        const startTime = Date.now();
        // Log compilation details
        this.logger.debug(
            {cond, timestamp: new Date().toISOString()},
            "Compiling base condition"
        );

        try {
            const {operator, right, isColumnComparison} = cond;
            const left = this.dialectUtils.escapeIdentifier(cond.left);

            if (Array.isArray(right)) {
                const placeholders = right
                    .map((_, index) => this.paramManager.getNextParameter())
                    .join(", ");

                const duration = Date.now() - startTime;
                // Log timing information
                this.logger.debug("Compilation completed in %dms", duration);
                this.logger.debug(
                    {
                        sql: `${left} ${operator} (${placeholders})`,
                        params: isColumnComparison ? [] : right,
                        duration,
                    },
                    "Base condition compiled (array)"
                );

                return {
                    sql: `${left} ${operator} (${placeholders})`,
                    params: isColumnComparison ? [] : right,
                };
            }

            const placeholder = isColumnComparison
                ? this.dialectUtils.escapeIdentifier(right as string)
                : this.paramManager.getNextParameter();

            const duration = Date.now() - startTime;
            // Log timing information
            this.logger.debug("Compilation completed in %dms", duration);
            this.logger.debug(
                {
                    sql: `${left} ${operator} ${placeholder}`,
                    params: isColumnComparison ? [] : [right],
                    duration,
                },
                "Base condition compiled (array)"
            );
            return {
                sql: `${left} ${operator} ${placeholder}`,
                params: isColumnComparison ? [] : [right],
            };
        } catch (error) {
            if (error instanceof Error) {
                // Log error information
                this.logger.error(
                    {cond, error: error.message, stack: error.stack},
                    "Error compiling base condition: "
                );
                throw error;
            }
            throw new Error("Unknown error occurred during compilation");
        }
    }
}
