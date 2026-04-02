import pino from "pino";
import {JoinClause, JoinType} from "@/query-builder/queries/common/clauses/JoinClause";
import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";

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
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder
    ): this {
        return this.addJoin("INNER", table, on);
    }

    /**
     * Adds a LEFT JOIN clause to the query.
     */
    leftJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder
    ): this {
        return this.addJoin("LEFT", table, on);
    }

    /**
     * Adds a RIGHT JOIN clause to the query.
     */
    rightJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder
    ): this {
        return this.addJoin("RIGHT", table, on);
    }

    /**
     * Adds a FULL JOIN clause to the query.
     */
    fullJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder
    ): this {
        return this.addJoin("FULL", table, on);
    }

    /**
     * Adds a CROSS JOIN clause to the query (no ON condition).
     *
     * @param table - The name of the table to join (supports "table AS alias" syntax).
     * @returns The current JoinClauseBuilder instance.
     */
    crossJoin(table: string): this {
        if (!table || typeof table !== "string") {
            this.logger.error({table}, "Invalid table name");
            throw new Error("Table name must be a non-empty string");
        }
        const [name, alias] = table.trim().split(/\s+[Aa][Ss]\s+/);
        this.joins.push({type: "CROSS", table: name, alias});
        return this;
    }

    /**
     * Adds a join clause of a specific type to the query.
     */
    private addJoin(
        type: JoinType,
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder
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

            const [name, alias] = table.trim().split(/\s+[Aa][Ss]\s+/);

            const builder = on(new WhereClauseBuilder());
            const onCondition = builder.build();

            if (!onCondition || onCondition.conditions.length === 0) {
                this.logger.warn({table: name, type}, "JOIN clause has no ON conditions");
                throw new Error("JOIN must have at least one ON condition");
            }

            this.logger.debug(
                {type, table: name, alias, on: onCondition},
                "Adding JOIN clause"
            );

            this.joins.push({
                type,
                table: name,
                alias,
                on: onCondition,
            });
            return this;
        } catch (err) {
            if (err instanceof Error) {
                this.logger.error(
                    {type, table, error: err.message, stack: err.stack},
                    "Failed to add JOIN clause"
                );
                throw new Error("Unable to add JOIN clause: " + err.message, {cause: err});
            }
            throw new Error("Unknown error occurred while adding JOIN clause", {cause: err});
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
