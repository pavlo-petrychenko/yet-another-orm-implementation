import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
import {GroupByBuilder} from "@/query-builder/builder/common/GroupByClauseBuilder";
import {OrderByBuilder} from "@/query-builder/builder/common/OrderByClauseBuilder";
import {OffsetBuilder} from "@/query-builder/builder/common/OffsetClauseBuilder";
import {LimitBuilder} from "@/query-builder/builder/common/LimitClauseBuilder";
import {OrderDirection} from "@/query-builder/queries/common/OrderByClause";
import {QueryDescription} from "@/query-builder/queries/common/CommonQueryDescription";
import {JoinClauseBuilder} from "@/query-builder/builder/common/JoinClauseBuilder";

/**
 * A mixin class providing utility methods for building common SQL clauses:
 * `WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT`, `OFFSET`, and various `JOIN` types.
 * This class is intended to be extended by other classes that require these SQL clauses
 * for constructing complex queries.
 */
export abstract class ClauseMixin {
    /** The builder for the `WHERE` clause. */
    protected whereBuilder = new WhereClauseBuilder();
    /** The builder for the `GROUP BY` clause. */
    protected groupByBuilder = new GroupByBuilder();
    /** The builder for the `ORDER BY` clause. */
    protected orderByBuilder = new OrderByBuilder();
    /** The builder for the `LIMIT` clause. */
    protected limitBuilder = new LimitBuilder();
    /** The builder for the `OFFSET` clause. */
    protected offsetBuilder = new OffsetBuilder();
    /** The builder for the `JOIN` clauses. */
    protected joinBuilder = new JoinClauseBuilder();
    /**
     * Adds a `WHERE` clause to the query by using a builder.
     *
     * @param callback - A function that takes a `WhereClauseBuilder` and modifies it.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    where(callback: (builder: WhereClauseBuilder) => void): this {
        callback(this.whereBuilder);
        return this;
    }
    /**
     * Adds columns to the `GROUP BY` clause.
     *
     * @param {string[]} columns - The columns to group by.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    groupBy(...columns: string[]): this {
        columns.forEach(c => this.groupByBuilder.add(c));
        return this;
    }
    /**
     * Adds an `ORDER BY` clause to the query.
     *
     * @param {string} column - The column to order by.
     * @param {OrderDirection} [direction='ASC'] - The direction of sorting (`ASC` or `DESC`).
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    orderBy(column: string, direction: OrderDirection = "ASC"): this {
        this.orderByBuilder.add(column, direction);
        return this;
    }
    /**
     * Adds a `LIMIT` clause to the query.
     *
     * @param {number} count - The number of rows to return.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    limit(count: number): this {
        this.limitBuilder.set(count);
        return this;
    }
    /**
     * Adds an `OFFSET` clause to the query.
     *
     * @param {number} count - The number of rows to skip before returning results.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    offset(count: number): this {
        this.offsetBuilder.set(count);
        return this;
    }
    /**
     * Adds an `INNER JOIN` clause to the query.
     *
     * @param {string} table - The table to join.
     * @param {(builder: WhereClauseBuilder) => WhereClauseBuilder} on - A function that defines the `ON` condition for the join.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    innerJoin(table: string,
              on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.join(table, on)
        return this;
    }
    /**
     * Adds a `LEFT JOIN` clause to the query.
     *
     * @param {string} table - The table to join.
     * @param {(builder: WhereClauseBuilder) => WhereClauseBuilder} on - A function that defines the `ON` condition for the join.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    leftJoin(table: string,
             on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.leftJoin(table, on)
        return this;
    }
    /**
     * Adds a `RIGHT JOIN` clause to the query.
     *
     * @param {string} table - The table to join.
     * @param {(builder: WhereClauseBuilder) => WhereClauseBuilder} on - A function that defines the `ON` condition for the join.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    rightJoin(table: string,
              on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.rightJoin(table, on)
        return this;
    }
    /**
     * Adds a `FULL JOIN` clause to the query.
     *
     * @param {string} table - The table to join.
     * @param {(builder: WhereClauseBuilder) => WhereClauseBuilder} on - A function that defines the `ON` condition for the join.
     * @returns {this} The current instance of `ClauseMixin` for method chaining.
     */
    fullJoin(table: string,
             on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.fullJoin(table, on)
        return this;
    }
    /**
     * Builds and returns the common SQL clauses (`WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT`, `OFFSET`, `JOIN`).
     *
     * @returns {Partial<QueryDescription>} A partial description of the query with the common clauses included.
     */

    protected buildCommonClauses(): Partial<QueryDescription> {
        const where = this.whereBuilder.build();
        return {
            where: where.conditions.length > 0 ? where : undefined,
            groupBy: this.groupByBuilder.build() || undefined,
            orderBy: this.orderByBuilder.build() || undefined,
            limit: this.limitBuilder.build() || undefined,
            offset: this.offsetBuilder.build() || undefined,
            join : this.joinBuilder.build() || undefined
        };
    }
}
