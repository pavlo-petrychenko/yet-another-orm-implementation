import {GroupByClause} from "@/query-builder/queries/common/GroupByClause";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import pino from "pino";

/**
 * Builder class to construct a SQL GROUP BY clause.
 *
 * Allows step-by-step construction of grouped column definitions
 * for use in query generation.
 */
export class GroupByBuilder {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    private columns: ColumnDescription[] = [];

    /**
     * Adds a column to the GROUP BY clause.
     *
     * @param column - The name of the column to group by.
     * @returns The current builder instance for method chaining.
     */
    add(column: string): this {
        // Validate column name
        if (!column || typeof column !== "string") {
            this.logger.error({column}, "Invalid column name provided");
            throw new Error("Column name must be a non-empty string");
        }
        this.logger.debug({name: column}, "Adding column to GROUP BY clause");
        this.columns.push({name: column});
        return this;
    }

    /**
     * Builds the final GroupByClause object.
     *
     * @returns A GroupByClause if columns were added, otherwise null.
     */
    build(): GroupByClause | null {

        if (this.columns.length) {
            this.logger.debug({type: "group_by", columns: this.columns}, "Built GROUP BY clause")
            return {type: "group_by", columns: this.columns};
        } else {
            this.logger.debug("No GROUP BY clause to build")
            return null;
        }
    }
}
