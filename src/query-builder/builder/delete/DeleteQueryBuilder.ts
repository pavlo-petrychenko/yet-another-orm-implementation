import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
import {DeleteQuery} from "@/query-builder/queries/Delete";
import pino from "pino";

/**
 * Builder class for constructing a SQL DELETE query.
 * Extends {@link ClauseMixin} to support common SQL clauses (e.g., WHERE, JOIN).
 */
export class DeleteQueryBuilder extends ClauseMixin {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

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
        // Validate table name
        if (!table || typeof table !== "string") {
            this.logger.error({table}, "DeleteQueryBuilder: Invalid table name");
            throw new Error("Table name must be a non-empty string");
        }
        this.tableName = table;
        this.logger.debug({table}, "DeleteQueryBuilder: Set table name");
        return this;
    }

    /**
     * Builds and returns the final DELETE query object.
     *
     * @returns A {@link DeleteQuery} object representing the DELETE SQL statement.
     */
    build(): DeleteQuery {
        this.logger.debug(
            {
                type: "DELETE",
                table: this.tableName,
                ...this.buildCommonClauses(),
            },
            "Built DELETE query"
        );

        return {
            type: "DELETE",
            table: this.tableName,
            ...this.buildCommonClauses(),
        };
    }
}
