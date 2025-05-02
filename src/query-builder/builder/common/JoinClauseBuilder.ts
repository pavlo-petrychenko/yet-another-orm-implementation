import {JoinClause, JoinType} from "@/query-builder/queries/common/JoinClause";
import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
/**
 * Builder class for constructing SQL JOIN clauses.
 */
export class JoinClauseBuilder {

    /**
     * Stores the list of join clauses being built.
     * @private
     */
    private joins: JoinClause[] = [];
    /**
     * Adds an INNER JOIN clause to the query.
     *
     * @param table - The name of the table to join.
     * @param on - A function that defines the ON condition using a WhereClauseBuilder.
     * @param alias - Optional alias for the joined table.
     * @returns The current JoinClauseBuilder instance.
     */
    join(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("INNER", table, on, alias);
    }
/**
 * Adds a LEFT JOIN clause to the query.
 */
    leftJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("LEFT", table, on, alias);
    }
/**
 * Adds a RIGHT JOIN clause to the query.
 */
 rightJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("RIGHT", table, on, alias);
    }
/**
 * Adds a FULL JOIN clause to the query.
 */
 fullJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("FULL", table, on, alias);
    }
/**
 * Adds a join clause of a specific type to the query.
 */
 private addJoin(
        type: JoinType,
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        const builder = on(new WhereClauseBuilder());
        this.joins.push({
            type,
            table,
            on: builder.build()
        });
        return this;
    }
    /**
     * Builds and returns the list of constructed join clauses.
     *
     * @returns An array of JoinClause objects.
     */
    build(): JoinClause[] {
        return this.joins;
    }
}
