import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
import {UpdateQuery} from "@/query-builder/queries/Update";
/**
 * Builder class for constructing SQL UPDATE queries.
 * Extends {@link ClauseMixin} to support common SQL clauses (e.g., WHERE, ORDER BY).
 */

export class UpdateQueryBuilder extends ClauseMixin {
    /**
     * The name of the table to be updated.
     * @private
     */

    private tableName: string = "";
    /**
     * A map of column names to their new values.
     * @private
     */
    private updates: Record<string, any> = {};
    /**
     * Sets the target table for the UPDATE query.
     *
     * @param table - The name of the table to update.
     * @returns The current UpdateQueryBuilder instance.
     */
    table(table: string): this {
        this.tableName = table;
        return this;
    }
    /**
     * Specifies the columns and their new values.
     *
     * @param updates - An object containing column-value pairs to update.
     * @returns The current UpdateQueryBuilder instance.
     */
    set(updates: Record<string, any>): this {
        this.updates = updates;
        return this;
    }
    /**
     * Builds and returns the final UPDATE query object.
     *
     * @returns An {@link UpdateQuery} representing the UPDATE SQL statement.
     */
    build(): UpdateQuery {
        return {
            type: "UPDATE",
            table: this.tableName,
            values: this.updates,
            ...this.buildCommonClauses()
        };
    }
}
