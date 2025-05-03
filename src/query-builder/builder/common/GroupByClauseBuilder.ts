import {GroupByClause} from "@/query-builder/queries/common/GroupByClause";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
/**
 * Builder class to construct a SQL GROUP BY clause.
 *
 * Allows step-by-step construction of grouped column definitions
 * for use in query generation.
 */
export class GroupByBuilder {
    private columns: ColumnDescription[] = [];
    /**
     * Adds a column to the GROUP BY clause.
     *
     * @param column - The name of the column to group by.
     * @returns The current builder instance for method chaining.
     */
    add(column: string): this {
        this.columns.push({name : column});
        return this;
    }
    /**
     * Builds the final GroupByClause object.
     *
     * @returns A GroupByClause if columns were added, otherwise null.
     */
    build(): GroupByClause | null {
        return this.columns.length
            ? { type: "group_by", columns: this.columns }
            : null;
    }
}