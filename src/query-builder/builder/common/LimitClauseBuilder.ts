import {LimitClause} from "@/query-builder/queries/common/LimitClause";

/**
 * Builder class for constructing a SQL LIMIT clause.
 */
export class LimitBuilder {
    /**
     * The number of rows to limit the result set to.
     * @private
     */

    private count: number | null = null;
    /**
     * Sets the limit count for the query.
     *
     * @param count - The maximum number of rows to return.
     * @returns The current LimitBuilder instance.
     */
    set(count: number): this {
        this.count = count;
        return this;
    }
    /**
     * Builds and returns the LIMIT clause.
     *
     * @returns A LimitClause object if a count is set, otherwise null.
     */
    build(): LimitClause | null {
        return this.count !== null
            ? { type: "limit", count: this.count }
            : null;
    }
}