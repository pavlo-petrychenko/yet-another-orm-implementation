import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
import {DeleteQuery} from "@/query-builder/queries/Delete";

/**
 * Builder class for constructing a SQL DELETE query.
 * Extends {@link ClauseMixin} to support common SQL clauses (e.g., WHERE, JOIN).
 */

export class DeleteQueryBuilder extends ClauseMixin {
    /**
     * The name of the table from which rows will be deleted.
     * @private
     */

    private tableName: string = "";
    /**
     * Sets the table name for the DELETE query.
     *
     * @param table - The name of the target table.
     * @returns The current DeleteQueryBuilder instance.
     */
    from(table: string): this {
        this.tableName = table;
        return this;
    }
    /**
     * Builds and returns the final DELETE query object.
     *
     * @returns A {@link DeleteQuery} object representing the DELETE SQL statement.
     */
    build(): DeleteQuery {
        return {
            type: "DELETE",
            table: this.tableName,
            ...this.buildCommonClauses()
        };
    }
}