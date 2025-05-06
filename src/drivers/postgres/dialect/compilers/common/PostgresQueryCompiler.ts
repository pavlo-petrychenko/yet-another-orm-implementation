import {PostgresParameterManager} from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {Query} from "@/query-builder/queries/Query";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {PostgresConditionCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresConditonCompiler";
import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";
import {ConditionClause} from "@/query-builder/queries/common/WhereClause";
import {LimitClause} from "@/query-builder/queries/common/LimitClause";
import {OffsetClause} from "@/query-builder/queries/common/OffsetClause";
/**
 * Abstract base class for compiling SQL queries for PostgreSQL.
 *
 * Provides common utility methods for appending SQL clauses such as WHERE, RETURNING, LIMIT, OFFSET,
 * and table name. Designed to be extended by concrete compilers (e.g., SELECT, INSERT).
 */

// Dependency injection
export abstract class PostgresQueryCompiler {
    /**
     * Constructs a new PostgresQueryCompiler.
     *
     * @param paramManager - Manages positional SQL parameters (e.g., $1, $2, ...).
     * @param dialectUtils - Utilities for dialect-specific tasks (e.g., identifier escaping).
     * @param conditionCompiler - Compiles WHERE clause condition trees.
     */
    constructor(
        protected paramManager: PostgresParameterManager,
        protected dialectUtils: PostgresDialectUtils,
        protected conditionCompiler : PostgresConditionCompiler
    ) {}
    /**
     * Compiles a query into a PostgreSQL-compatible SQL string with parameters.
     *
     * Must be implemented by subclasses.
     *
     * @param query - The high-level query object to compile.
     * @returns A compiled query object containing SQL and parameters.
     */
    abstract compile(query : Query) : CompiledQuery;
    /**
     * Appends the target table to the query parts.
     *
     * @param parts - The array collecting SQL string segments.
     * @param table - The table name to include in the query.
     */
    protected addTable(parts: string[], table : string){
        parts.push(this.dialectUtils.escapeIdentifier(table))
    }
    /**
     * Appends a `WHERE` clause to the query if conditions are provided.
     *
     * @param parts - The array collecting SQL string segments.
     * @param params - The array collecting parameter values.
     * @param condition - Optional condition clause to compile.
     */
    protected addWhereClause(parts: string[], params : any[], condition : ConditionClause | undefined) : void{
        if(!condition){
            return;
        }
        parts.push('WHERE')
        const compiledCondition = this.conditionCompiler.compile(condition)
        parts.push(compiledCondition.sql)
        params.push(...compiledCondition.params)
    }
    /**
     * Appends a `RETURNING` clause to the query if specified.
     *
     * @param parts - The array collecting SQL string segments.
     * @param returning - Optional returning clause specifying columns to return.
     */
    protected addReturningClause(parts: string[], returning : ReturningClause | undefined) : void{
        if(!returning){
            return;
        }
        parts.push(`RETURNING ${returning.columns.map(f => this.dialectUtils.escapeIdentifier(f)).join(', ')}`)
    }
    /**
     * Appends a `LIMIT` clause to the query if specified.
     *
     * @param parts - The array collecting SQL string segments.
     * @param params - The array collecting parameter values.
     * @param limit - Optional limit clause specifying the row count.
     */
    protected addLimitClause(parts : string[], params : any[], limit : LimitClause | undefined) : void{
        if(!limit) return;
        parts.push('LIMIT', this.paramManager.getNextParameter());
        params.push(limit.count);
    }
    /**
     * Appends an `OFFSET` clause to the query if specified.
     *
     * @param parts - The array collecting SQL string segments.
     * @param params - The array collecting parameter values.
     * @param offset - Optional offset clause specifying the number of rows to skip.
     */
    protected addOffsetClause(parts : string[], params : any[], offset : OffsetClause | undefined) : void{
        if(!offset) return;
        parts.push('OFFSET', this.paramManager.getNextParameter());
        params.push(offset.count);
    }

}