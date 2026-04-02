import pino from "pino";
import {PostgresParameterManager} from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {BaseCondition, ConditionClause, ConditionGroup, RawCondition} from "@/query-builder/queries/common/clauses/WhereClause";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";

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

    private subqueryCompileFn?: (query: any) => CompiledQuery;

    constructor(
        private paramManager: PostgresParameterManager,
        private dialectUtils: PostgresDialectUtils
    ) {
    }

    /**
     * Sets the function used to compile subqueries (e.g., SELECT in WHERE IN).
     * Called by PostgresDialect after compiler initialization to avoid circular dependencies.
     */
    setSubqueryCompileFn(fn: (query: any) => CompiledQuery): void {
        this.subqueryCompileFn = fn;
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
            let result: CompiledQuery;
            if (condition.type === "condition") {
                result = this.compileBaseCondition(condition);
            } else if (condition.type === "raw_condition") {
                result = {sql: (condition as RawCondition).sql, params: [...(condition as RawCondition).params]};
            } else {
                result = this.compileConditionGroup(condition as ConditionGroup);
            }

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
            throw new Error("Unknown error occurred during compilation", {cause: error});
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
            throw new Error("Unknown error occurred during compilation", {cause: error});
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

            // IS NULL / IS NOT NULL — no right-hand parameter
            if (operator === "IS NULL" || operator === "IS NOT NULL") {
                return {
                    sql: `${left} ${operator}`,
                    params: [],
                };
            }

            // Subquery — right is a SelectQuery object
            if (right && typeof right === "object" && !Array.isArray(right) && "type" in right && (right as any).type === "SELECT") {
                if (!this.subqueryCompileFn) {
                    throw new Error("Subquery compilation not configured");
                }
                const compiled = this.subqueryCompileFn(right);
                return {
                    sql: `${left} ${operator} (${compiled.sql})`,
                    params: compiled.params,
                };
            }

            // BETWEEN / NOT BETWEEN — two parameters
            if ((operator === "BETWEEN" || operator === "NOT BETWEEN") && Array.isArray(right) && right.length === 2) {
                const p1 = this.paramManager.getNextParameter();
                const p2 = this.paramManager.getNextParameter();
                return {
                    sql: `${left} ${operator} ${p1} AND ${p2}`,
                    params: [right[0], right[1]],
                };
            }

            if (Array.isArray(right)) {
                const placeholders = right
                    .map(() => this.paramManager.getNextParameter())
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
            throw new Error("Unknown error occurred during compilation", {cause: error});
        }
    }
}
