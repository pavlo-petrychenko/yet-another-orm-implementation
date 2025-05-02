import {OffsetClause} from "@/query-builder/queries/common/OffsetClause";
/**
 * Builder class for constructing a SQL OFFSET clause.
 */
export class OffsetBuilder {

    /**
     * The number of rows to skip in the result set.
     * @private
     */
    private count: number | null = null;
    /**
     * Sets the offset count for the query.
     *
     * @param count - The number of rows to skip.
     * @returns The current OffsetBuilder instance.
     */
    set(count: number): this {
        this.count = count;
        return this;
    }
    /**
     * Builds and returns the OFFSET clause.
     *
     * @returns An OffsetClause object if a count is set, otherwise null.
     */
    build(): OffsetClause | null {
        return this.count !== null
            ? { type: "offset", count: this.count }
            : null;
    }
}