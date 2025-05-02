import {InsertQuery} from "@/query-builder/queries/Insert";

/**
 * Builder class for constructing a SQL INSERT query.
 */
export class InsertQueryBuilder {

    /**
     * The name of the table into which data will be inserted.
     * @private
     */
    private tableName: string = "";

    /**
     * The values to be inserted, as key-value pairs.
     * @private
     */
    private values: Record<string, any>;
    /**
     * Sets the target table for the INSERT query.
     *
     * @param table - The name of the table.
     * @returns The current InsertQueryBuilder instance.
     */
    into(table: string): this {
        this.tableName = table;
        return this;
    }
    /**
     * Sets the values to be inserted into the table.
     *
     * @param values - An object containing column-value pairs.
     * @returns The current InsertQueryBuilder instance.
     */
    valuesList(values: Record<string, any>): this {
        this.values = values;
        return this;
    }
    /**
     * Builds and returns the final INSERT query object.
     *
     * @returns An {@link InsertQuery} representing the INSERT SQL statement.
     */
    build(): InsertQuery {
        return {
            type: "INSERT",
            table: this.tableName,
            values: this.values
        };
    }
}