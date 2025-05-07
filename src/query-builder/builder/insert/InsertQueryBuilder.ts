// import {InsertQuery} from "@/query-builder/queries/Insert";
import pino from "pino";
import {InsertQuery} from "../../queries/Insert";
// import {InsertQuery} from "query-builder/queries/Insert";

/**
 * Builder class for constructing a SQL INSERT query.
 */
export class InsertQueryBuilder {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });
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
        // Validate table name
        if (!table || typeof table !== "string") {
            this.logger.error({table}, "InsertQueryBuilder: Invalid table name");
            throw new Error("Table name must be a non-empty string");
        }
        this.tableName = table;
        this.logger.debug({table}, "InsertQueryBuilder: Set table name");
        return this;
    }

    /**
     * Sets the values to be inserted into the table.
     *
     * @param values - An object containing column-value pairs.
     * @returns The current InsertQueryBuilder instance.
     */
    valuesList(values: Record<string, any>): this {
        // Validate values
        if (!values || typeof values !== "object" || Array.isArray(values)) {
            this.logger.error({values}, "InsertQueryBuilder: Invalid values");
            throw new Error("Values must be a non-empty object");
        }
        this.values = values;
        this.logger.debug({values}, "InsertQueryBuilder: Set values");
        return this;
    }

    /**
     * Builds and returns the final INSERT query object.
     *
     * @returns An {@link InsertQuery} representing the INSERT SQL statement.
     */
    build(): InsertQuery {
        this.logger.debug(
            {
                type: "INSERT",
                table: this.tableName,
                values: this.values,
            },
            "Built INSERT query"
        );

        return {
            type: "INSERT",
            table: this.tableName,
            values: this.values,
        };
    }
}

