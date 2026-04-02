import pino from "pino";
import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import {Query} from "@/query-builder/queries/Query";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {SQL} from "@/drivers/postgres/dialect/types/SQL";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import {JoinClause} from "@/query-builder/queries/common/clauses/JoinClause";
import {OrderByClause} from "@/query-builder/queries/common/clauses/OrderByClause";
import {RawExpression} from "@/query-builder/queries/common/RawExpression";
import {SelectQuery} from "@/query-builder/queries/Select";

/**
 * Compiler for building PostgreSQL SELECT queries.
 *
 * Extends PostgresQueryCompiler and provides the logic for compiling a `Query` of type SELECT
 * into a SQL string and corresponding parameters array.
 */
export class PostgresSelectCompiler extends PostgresQueryCompiler {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    /**
     * Compiles a SELECT query into SQL and parameters.
     *
     * @param query - The SELECT query object to compile.
     * @returns The compiled SQL string and parameter values.
     * @throws Error if the query type is not SELECT.
     */
    compile(query: Query): CompiledQuery {
        const startTime = Date.now();
        // Log compilation details
        this.logger.debug(
            {query, timestamp: new Date().toISOString()},
            "Starting select query compilation"
        );
        try {
            const parts: string[] = [SQL.SELECT];
            const params: any[] = [];

            if (query.type !== "SELECT") {
                const error = new Error(`Invalid query type: ${query.type}`);
                this.logger.error(
                    {query, error: error.message, stack: error.stack},
                    "Select query compilation failed: "
                );
                throw error;
            }
            if (query.distinct) {
                parts.push("DISTINCT");
            }
            this.addColumns(parts, params, query.columns, query.rawColumns);
            this.addFromClause(parts, query.table, query.tableAlias);
            this.addJoinClause(parts, params, query.join);
            this.addWhereClause(parts, params, query.where);
            this.addGroupByClause(parts, query.groupBy);
            this.addHavingClause(parts, params, query.having);
            this.addOrderByClause(parts, query.orderBy);
            this.addLimitClause(parts, params, query.limit);
            this.addOffsetClause(parts, params, query.offset);
            this.addUnionClauses(parts, params, query.unions);

            const duration = Date.now() - startTime;
            // Log timing information
            this.logger.debug("Compilation completed in %dms", duration);
            this.logger.debug(
                {sql: parts.join(" "), params, duration},
                "Select query compiled successfully: "
            );
            return {sql: parts.join(" "), params};
        } catch (error) {
            if (error instanceof Error) {
                // Log error information
                this.logger.error(
                    {query, error: error.message, stack: error.stack},
                    "Failed to compile select query: "
                );
                throw error;
            }
            throw new Error("Unknown error occurred during select query compilation", {cause: error});
        }
    }

    /**
     * Appends column list to SELECT clause.
     *
     * @param parts - Array collecting SQL fragments.
     * @param columns - Array of columns to include in the SELECT clause.
     *                  If empty, selects all columns using '*'.
     */
    private addColumns(parts: string[], params: any[], columns: Array<ColumnDescription>, rawColumns?: RawExpression[]): void {
        const escapedCols = columns.length > 0
            ? columns.map((col) => this.dialectUtils.escapeIdentifier(col))
            : ["*"];

        const rawParts: string[] = [];
        if (rawColumns) {
            for (const raw of rawColumns) {
                rawParts.push(raw.sql);
                params.push(...raw.params);
            }
        }

        const allCols = [...escapedCols, ...rawParts];
        // If we have raw columns and the only regular column is *, remove it
        if (rawParts.length > 0 && escapedCols.length === 1 && escapedCols[0] === "*" && columns.length === 0) {
            parts.push(rawParts.join(", "));
        } else {
            parts.push(allCols.join(", "));
        }
    }

    /**
     * Appends FROM clause to the query.
     *
     * @param parts - Array collecting SQL fragments.
     * @param table - Name of the table to select from.
     */
    private addFromClause(parts: string[], table: string, tableAlias?: string) {
        const escaped = this.dialectUtils.escapeIdentifier(table);
        if (tableAlias) {
            parts.push("FROM", `${escaped} AS ${this.dialectUtils.escapeIdentifier(tableAlias)}`);
        } else {
            parts.push("FROM", escaped);
        }
    }

    /**
     * Appends JOIN clauses if any are present.
     *
     * @param parts - Array collecting SQL fragments.
     * @param params - Array collecting parameter values.
     * @param joins - Array of JOIN clause objects.
     */
    private addJoinClause(
        parts: string[],
        params: any[],
        joins: JoinClause[] | undefined
    ): void {
        if (!joins || joins.length === 0) {
            return;
        }
        joins.forEach((join) => {
            const joinType = join.type + " JOIN";
            let tableName = this.dialectUtils.escapeIdentifier(join.table);
            if (join.alias) {
                tableName += ` AS ${this.dialectUtils.escapeIdentifier(join.alias)}`;
            }

            if (join.type === "CROSS" || !join.on) {
                parts.push(`${joinType} ${tableName}`);
            } else {
                const onCondition = this.conditionCompiler.compile(join.on);
                params.push(...onCondition.params);
                parts.push(`${joinType} ${tableName} ON ${onCondition.sql}`);
            }
        });
    }

    /**
     * Appends ORDER BY clause to the query.
     *
     * @param parts - Array collecting SQL fragments.
     * @param order - Optional ORDER BY clause.
     */
    private addOrderByClause(
        parts: string[],
        order: OrderByClause | undefined
    ): void {
        if (!order) return;
        parts.push("ORDER BY");
        parts.push(
            order.orders
                .map((clause) => {
                    return `${this.dialectUtils.escapeIdentifier(clause.column)} ${
                        clause.direction
                    }`;
                })
                .join(", ")
        );
    }

    /**
     * Appends UNION / UNION ALL clauses to the query.
     */
    private addUnionClauses(
        parts: string[],
        params: any[],
        unions?: { query: SelectQuery; all: boolean }[]
    ): void {
        if (!unions || unions.length === 0) return;
        for (const union of unions) {
            parts.push(union.all ? "UNION ALL" : "UNION");
            const compiled = this.compile(union.query as Query);
            parts.push(compiled.sql);
            params.push(...compiled.params);
        }
    }
}
