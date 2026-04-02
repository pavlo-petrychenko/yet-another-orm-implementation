import pino from "pino";
import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import {SelectQuery} from "@/query-builder/queries/Select";
import {QueryType} from "@/query-builder/queries/Query";
import {RawExpression, raw as rawExpr} from "@/query-builder/queries/common/RawExpression";

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
     * Whether to use SELECT DISTINCT.
     * @private
     */
    private isDistinct: boolean = false;

    /**
     * Optional alias for the main table.
     * @private
     */
    private tableAlias: string = "";

    /**
     * Raw SQL expressions to include in the SELECT column list.
     * @private
     */
    private rawColumns: RawExpression[] = [];

    /**
     * Adds a raw SQL expression to the SELECT column list.
     *
     * @param expr - A raw SQL string or RawExpression object.
     * @returns The current SelectQueryBuilder instance.
     */
    selectRaw(expr: string | RawExpression): this {
        if (typeof expr === "string") {
            this.rawColumns.push(rawExpr(expr));
        } else {
            this.rawColumns.push(expr);
        }
        return this;
    }

    /**
     * Marks this query as SELECT DISTINCT.
     *
     * @returns The current SelectQueryBuilder instance.
     */
    distinct(): this {
        this.isDistinct = true;
        return this;
    }

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
        const [name, alias] = table.trim().split(/\s+[Aa][Ss]\s+/);
        this.tableName = name;
        this.tableAlias = alias || "";
        this.logger.debug({table: name, alias}, "SelectQueryBuilder: Set table name");
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
            const starIdx = this.columns.findIndex((value) => value.name === "*");
            if (starIdx !== -1) {
                this.columns.splice(starIdx, 1);
            }
            columns.map((c) => {
                const [name, alias] = c.trim().split(/\s+[Aa][Ss]\s+/);
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
     * UNION queries to append.
     * @private
     */
    private unions: { query: SelectQuery; all: boolean }[] = [];

    /**
     * Appends a UNION with another SELECT query.
     *
     * @param query - The built SelectQuery to union with.
     * @param all - If true, uses UNION ALL (includes duplicates). Defaults to false.
     * @returns The current SelectQueryBuilder instance.
     */
    union(query: SelectQuery, all: boolean = false): this {
        this.unions.push({query, all});
        return this;
    }

    /**
     * Appends a UNION ALL with another SELECT query.
     *
     * @param query - The built SelectQuery to union with.
     * @returns The current SelectQueryBuilder instance.
     */
    unionAll(query: SelectQuery): this {
        return this.union(query, true);
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
            type: QueryType.SELECT,
            table: this.tableName,
            columns: this.columns,
            distinct: this.isDistinct || undefined,
            tableAlias: this.tableAlias || undefined,
            rawColumns: this.rawColumns.length > 0 ? this.rawColumns : undefined,
            unions: this.unions.length > 0 ? this.unions : undefined,
            ...this.buildCommonClauses(),
        };
    }
}
