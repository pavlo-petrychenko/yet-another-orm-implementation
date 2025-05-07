// import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
// import {SelectQuery} from "@/query-builder/queries/Select";
// import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
// import {Connection} from "@/connection/Connection";
import pino from "pino";
import {ClauseMixin} from "../common/ClauseMixin";
import {ColumnDescription} from "../../queries/common/ColumnDecription";
import {SelectQuery} from "../../queries/Select";
// import {ClauseMixin} from "query-builder/builder/common/ClauseMixin";
// import {ColumnDescription} from "query-builder/queries/common/ColumnDecription";
// import {SelectQuery} from "query-builder/queries/Select";

/**
 * Builder class for constructing SQL SELECT queries.
 * Extends {@link ClauseMixin} to support common SQL clauses (e.g., WHERE, JOIN, ORDER BY).
 */
export class SelectQueryBuilder extends ClauseMixin {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    /**
     * The name of the table from which data will be selected.
     * @private
     */
    private tableName: string = "";

    /**
     * The list of columns to select from the table.
     * @private
     */
    private columns: ColumnDescription[] = [];


    /**
     * Sets the table to select from.
     *
     * @param table - The name of the source table.
     * @returns The current SelectQueryBuilder instance.
     */
    from(table: string): this {
        // Validate table name
        if (!table || typeof table !== "string") {
            this.logger.error({table}, "SelectQueryBuilder: Invalid table name");
            throw new Error("Table name must be a non-empty string");
        }
        this.tableName = table;
        this.logger.debug({table}, "SelectQueryBuilder: Set table name");
        return this;
    }

    /**
     * Specifies the columns to be selected.
     * If no columns are provided, selects all columns (`*`).
     *
     * @param columns - A list of column names or aliases in the format `"name"` or `"name AS alias"`.
     * @returns The current SelectQueryBuilder instance.
     */
    select(...columns: string[]): this {
        if (columns.length > 0) {
            this.columns.splice(
                this.columns.findIndex((value) => value.name === "*"),
                1
            );
            columns.map((c) => {
                const [name, alias] = c.trim().split(" AS ");
                this.columns.push({name, alias, table: this.tableName});
            });
            this.logger.debug(
                {columns: this.columns},
                "SelectQueryBuilder: Column list"
            );
        } else {
            this.columns = [{name: "*"}];
        }
        return this;
    }

    /**
     * Builds and returns the final SELECT query object.
     *
     * @returns A {@link SelectQuery} representing the full SELECT SQL statement.
     */
    build(): SelectQuery {
        this.logger.debug(
            {
                type: "SELECT",
                table: this.tableName,
                columns: this.columns,
                ...this.buildCommonClauses(),
            },
            "Built SELECT query"
        );

        return {
            type: "SELECT",
            table: this.tableName,
            columns: this.columns,
            ...this.buildCommonClauses(),
        };
    }
}

