// import {
//     JoinClause,
//     JoinType,
// } from "@/query-builder/queries/common/JoinClause";
// import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
import pino from "pino";
import {JoinClause, JoinType} from "../../queries/common/JoinClause";
import {WhereClauseBuilder} from "./WhereClauseBuilder";
// import {JoinClause, JoinType} from "query-builder/queries/common/JoinClause";
// import {WhereClauseBuilder} from "query-builder/builder/common/WhereClauseBuilder";

/**
 * Builder class for constructing SQL JOIN clauses.
 */
export class JoinClauseBuilder {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    /**
     * Stores the list of join clauses being built.
     * @private
     */
    private joins: JoinClause[] = [];

    /**
     * Adds an INNER JOIN clause to the query.
     *
     * @param table - The name of the table to join.
     * @param on - A function that defines the ON condition using a WhereClauseBuilder.
     * @param alias - Optional alias for the joined table.
     * @returns The current JoinClauseBuilder instance.
     */
    join(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("INNER", table, on, alias);
    }

    /**
     * Adds a LEFT JOIN clause to the query.
     */
    leftJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("LEFT", table, on, alias);
    }

    /**
     * Adds a RIGHT JOIN clause to the query.
     */
    rightJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("RIGHT", table, on, alias);
    }

    /**
     * Adds a FULL JOIN clause to the query.
     */
    fullJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("FULL", table, on, alias);
    }

    /**
     * Adds a join clause of a specific type to the query.
     */
    private addJoin(
        type: JoinType,
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        try {
            // Validate table name and ON clause function
            if (!table || typeof table !== "string") {
                this.logger.error({table}, "Invalid table name");
                throw new Error("Table name must be a non-empty string");
            }

            if (typeof on !== "function") {
                this.logger.error({on}, "Invalid ON clause callback");
                throw new Error(
                    "ON clause must be a function that returns a WhereClauseBuilder"
                );
            }

            const builder = on(new WhereClauseBuilder());

            if (!builder.build() || builder.build().conditions.length === 0) {
                this.logger.warn({table, type}, "JOIN clause has no ON conditions");
                throw new Error("JOIN must have at least one ON condition");
            }

            this.logger.debug(
                {type, table, on: builder.build()},
                "Adding JOIN clause"
            );

            this.joins.push({
                type,
                table,
                on: builder.build(),
            });
            return this;
        } catch (err) {
            if (err instanceof Error) {
                // Log error information
                this.logger.error(
                    {
                        type,
                        table,
                        error: err.message,
                        stack: err.stack,
                    },
                    "Failed to add JOIN clause"
                );
                throw new Error("Unable to add JOIN clause: " + err.message);
            }
            throw new Error("Unknown error occurred while adding JOIN clause");
        }
    }

    /**
     * Builds and returns the list of constructed join clauses.
     *
     * @returns An array of JoinClause objects.
     */
    build(): JoinClause[] {
        this.logger.debug({joins: this.joins}, "Built JOIN clause");
        return this.joins;
    }

}
