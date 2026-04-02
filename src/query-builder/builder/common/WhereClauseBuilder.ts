import pino from "pino";
import {BaseCondition, ComparisonOperator, ConditionGroup, LogicalOperator, RawCondition} from "@/query-builder/queries/common/clauses/WhereClause";

/**
 * Builder class for constructing SQL WHERE clause expressions using logical and comparison operators.
 */
export class WhereClauseBuilder {
    private logger = pino({
        transport: {
            target: "pino-pretty",
            options: {colorize: true},
        },
    });

    /**
     * The root condition group for the WHERE clause.
     * @private
     */
    private rootGroup: ConditionGroup = {
        type: "group",
        conditions: [],
        connector: "AND",
    };

    /**
     * The current group where new conditions are being added.
     * @private
     */
    private currentGroup: ConditionGroup = this.rootGroup;

    /**
     * Adds a basic comparison condition to the current group.
     *
     * @param left - The left-hand side of the comparison (column name or alias).
     * @param operator - The comparison operator (e.g., '=', '<', 'IN').
     * @param right - The right-hand side value(s).
     * @param connector - The logical connector (e.g., 'AND', 'OR'). Defaults to 'AND'.
     * @param isColumnComparison - Whether the right-hand side is a column instead of a value.
     * @returns The current WhereClauseBuilder instance.
     * @private
     */
    private addBaseCondition(
        left: string,
        operator: ComparisonOperator,
        right: string | number | (string | number)[],
        connector: LogicalOperator = "AND",
        isColumnComparison = false
    ): this {
        // Validate column names and arrays
        if (!left || typeof left !== "string") {
            this.logger.error({left}, "Invalid 'left' column expression");
            throw new Error("Left-hand side of condition is invalid");
        }

        const [name, alias] = left.trim().split(/\s+[Aa][Ss]\s+/);

        if (!name) {
            this.logger.error({left}, "Missing column name in expression");
            throw new Error("Column name is required in condition");
        }

        if (
            Array.isArray(right) &&
            right.length === 0 &&
            (operator === "IN" || operator === "NOT IN")
        ) {
            this.logger.warn(
                {
                    left,
                    operator,
                    right,
                },
                "Empty array passed to IN/NOT IN clause: "
            );
            throw new Error(`Empty array passed to '${operator}' clause`);
        }

        const condition: BaseCondition = {
            type: "condition",
            left: {name, alias},
            operator,
            right,
            isColumnComparison,
        };

        this.logger.debug({condition}, "Added base condition to WHERE clause");

        this.currentGroup.conditions.push({...condition, connector});
        return this;
    }

    /**
     * Adds a new nested group of conditions.
     *
     * @param connector - The logical connector to link this group (e.g., 'AND', 'OR').
     * @param buildFn - A function to build the nested condition group.
     * @returns The current WhereClauseBuilder instance.
     * @private
     */
    private addGroup(
        connector: LogicalOperator,
        buildFn: (builder: WhereClauseBuilder) => void
    ): this {
        const subBuilder = new WhereClauseBuilder();
        buildFn(subBuilder);
        const group = subBuilder.build();

        this.logger.debug({group}, "Added condition group to WHERE clause");

        this.currentGroup.conditions.push({...group, connector});
        return this;
    }

    /**
     * Adds a null-check condition (IS NULL / IS NOT NULL).
     * @private
     */
    private addNullCondition(
        left: string,
        operator: "IS NULL" | "IS NOT NULL",
        connector: LogicalOperator = "AND"
    ): this {
        if (!left || typeof left !== "string") {
            this.logger.error({left}, "Invalid 'left' column expression");
            throw new Error("Left-hand side of condition is invalid");
        }

        const [name, alias] = left.trim().split(/\s+[Aa][Ss]\s+/);

        if (!name) {
            this.logger.error({left}, "Missing column name in expression");
            throw new Error("Column name is required in condition");
        }

        const condition: BaseCondition = {
            type: "condition",
            left: {name, alias},
            operator,
            right: null as any,
            isColumnComparison: false,
        };

        this.logger.debug({condition}, "Added null condition to WHERE clause");

        this.currentGroup.conditions.push({...condition, connector});
        return this;
    }

    /**
     * Adds a subquery condition (e.g., col IN (SELECT ...)).
     * Uses dynamic require to avoid circular imports.
     * @private
     */
    private addSubqueryCondition(
        column: string,
        operator: "IN" | "NOT IN",
        callback: (qb: any) => any,
        connector: LogicalOperator
    ): this {
        // Dynamic require to avoid circular dependency
        const {SelectQueryBuilder} = require("@/query-builder/builder/select/SelectQueryBuilder");
        const qb = new SelectQueryBuilder();
        callback(qb);
        const subquery = qb.build();

        const [name, alias] = column.trim().split(/\s+[Aa][Ss]\s+/);

        const condition: BaseCondition = {
            type: "condition",
            left: {name, alias},
            operator,
            right: subquery,
            isColumnComparison: false,
        };

        this.currentGroup.conditions.push({...condition, connector});
        return this;
    }

    /**
     * Adds a condition connected with AND.
     */
    where(
        left: string,
        operator: ComparisonOperator,
        right: string | number | (string | number)[],
        isColumnComparison = false
    ): this {
        return this.addBaseCondition(
            left,
            operator,
            right,
            "AND",
            isColumnComparison
        );
    }

    /**
     * Adds a condition connected with AND.
     */
    andWhere(
        left: string,
        operator: ComparisonOperator,
        right: string | number | (string | number)[],
        isColumnComparison = false
    ): this {
        return this.addBaseCondition(
            left,
            operator,
            right,
            "AND",
            isColumnComparison
        );
    }

    /**
     * Adds a condition connected with OR.
     */
    orWhere(
        left: string,
        operator: ComparisonOperator,
        right: string | number | (string | number)[],
        isColumnComparison = false
    ): this {
        return this.addBaseCondition(
            left,
            operator,
            right,
            "OR",
            isColumnComparison
        );
    }

    /**
     * Adds a NOT condition connected with AND.
     */
    whereNot(
        left: string,
        operator: ComparisonOperator,
        right: string | number | (string | number)[],
        isColumnComparison = false
    ): this {
        return this.addBaseCondition(
            left,
            operator,
            right,
            "AND NOT",
            isColumnComparison
        );
    }

    /**
     * Adds a NOT condition connected with OR.
     */
    orWhereNot(
        left: string,
        operator: ComparisonOperator,
        right: string | number | (string | number)[],
        isColumnComparison = false
    ): this {
        return this.addBaseCondition(
            left,
            operator,
            right,
            "OR NOT",
            isColumnComparison
        );
    }

    /**
     * Adds an IN condition connected with AND.
     * Accepts an array of values or a callback that builds a subquery.
     */
    whereIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
        if (typeof values === "function") {
            return this.addSubqueryCondition(column, "IN", values, "AND");
        }
        return this.addBaseCondition(column, "IN", values, "AND");
    }

    /**
     * Adds a NOT IN condition connected with AND.
     * Accepts an array of values or a callback that builds a subquery.
     */
    whereNotIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
        if (typeof values === "function") {
            return this.addSubqueryCondition(column, "NOT IN", values, "AND");
        }
        return this.addBaseCondition(column, "NOT IN", values, "AND");
    }

    /**
     * Adds an IN condition connected with OR.
     * Accepts an array of values or a callback that builds a subquery.
     */
    orWhereIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
        if (typeof values === "function") {
            return this.addSubqueryCondition(column, "IN", values, "OR");
        }
        return this.addBaseCondition(column, "IN", values, "OR");
    }

    /**
     * Adds a NOT IN condition connected with OR.
     * Accepts an array of values or a callback that builds a subquery.
     */
    orWhereNotIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
        if (typeof values === "function") {
            return this.addSubqueryCondition(column, "NOT IN", values, "OR");
        }
        return this.addBaseCondition(column, "NOT IN", values, "OR");
    }

    /**
     * Adds a LIKE condition connected with AND.
     */
    whereLike(column: string, pattern: string): this {
        return this.addBaseCondition(column, "LIKE", pattern, "AND");
    }

    /**
     * Adds a LIKE condition connected with OR.
     */
    orWhereLike(column: string, pattern: string): this {
        return this.addBaseCondition(column, "LIKE", pattern, "OR");
    }

    /**
     * Adds a NOT LIKE condition connected with AND.
     */
    whereNotLike(column: string, pattern: string): this {
        return this.addBaseCondition(column, "NOT LIKE", pattern, "AND");
    }

    /**
     * Adds an ILIKE condition connected with AND.
     */
    whereILike(column: string, pattern: string): this {
        return this.addBaseCondition(column, "ILIKE", pattern, "AND");
    }

    /**
     * Adds an ILIKE condition connected with OR.
     */
    orWhereILike(column: string, pattern: string): this {
        return this.addBaseCondition(column, "ILIKE", pattern, "OR");
    }

    /**
     * Adds a NOT ILIKE condition connected with AND.
     */
    whereNotILike(column: string, pattern: string): this {
        return this.addBaseCondition(column, "NOT ILIKE", pattern, "AND");
    }

    /**
     * Adds a BETWEEN condition connected with AND.
     */
    whereBetween(column: string, min: string | number, max: string | number): this {
        return this.addBaseCondition(column, "BETWEEN", [min, max], "AND");
    }

    /**
     * Adds a BETWEEN condition connected with OR.
     */
    orWhereBetween(column: string, min: string | number, max: string | number): this {
        return this.addBaseCondition(column, "BETWEEN", [min, max], "OR");
    }

    /**
     * Adds a NOT BETWEEN condition connected with AND.
     */
    whereNotBetween(column: string, min: string | number, max: string | number): this {
        return this.addBaseCondition(column, "NOT BETWEEN", [min, max], "AND");
    }

    /**
     * Adds a NOT BETWEEN condition connected with OR.
     */
    orWhereNotBetween(column: string, min: string | number, max: string | number): this {
        return this.addBaseCondition(column, "NOT BETWEEN", [min, max], "OR");
    }

    /**
     * Adds an IS NULL condition connected with AND.
     */
    whereNull(column: string): this {
        return this.addNullCondition(column, "IS NULL", "AND");
    }

    /**
     * Adds an IS NULL condition connected with OR.
     */
    orWhereNull(column: string): this {
        return this.addNullCondition(column, "IS NULL", "OR");
    }

    /**
     * Adds an IS NOT NULL condition connected with AND.
     */
    whereNotNull(column: string): this {
        return this.addNullCondition(column, "IS NOT NULL", "AND");
    }

    /**
     * Adds an IS NOT NULL condition connected with OR.
     */
    orWhereNotNull(column: string): this {
        return this.addNullCondition(column, "IS NOT NULL", "OR");
    }

    /**
     * Adds a raw SQL condition connected with AND.
     */
    whereRaw(sql: string, params: any[] = []): this {
        return this.addRawCondition(sql, params, "AND");
    }

    /**
     * Adds a raw SQL condition connected with OR.
     */
    orWhereRaw(sql: string, params: any[] = []): this {
        return this.addRawCondition(sql, params, "OR");
    }

    /**
     * Adds a raw SQL condition to the current group.
     * @private
     */
    private addRawCondition(
        sql: string,
        params: any[],
        connector: LogicalOperator
    ): this {
        const condition: RawCondition = {
            type: "raw_condition",
            sql,
            params,
            connector,
        };
        this.currentGroup.conditions.push(condition);
        return this;
    }

    /**
     * Adds a nested group of conditions with a logical connector.
     *
     * @param connector - The logical connector to link the group.
     * @param buildFn - A function that receives a WhereClauseBuilder to define group conditions.
     * @returns The current WhereClauseBuilder instance.
     */
    group(
        connector: LogicalOperator,
        buildFn: (builder: WhereClauseBuilder) => void
    ): this {
        return this.addGroup(connector, buildFn);
    }

    /**
     * Builds and returns the full condition group for the WHERE clause.
     *
     * @returns A ConditionGroup representing the full WHERE clause logic.
     */
    build(): ConditionGroup {
        this.logger.debug(
            {
                rootGroup: this.rootGroup,
            },
            "Built final condition group"
        );
        return this.rootGroup;
    }
}
