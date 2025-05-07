// import {
//     BaseCondition,
//     ComparisonOperator,
//     ConditionClause,
//     ConditionGroup,
//     LogicalOperator,
// } from "@/query-builder/queries/common/WhereClause";
// import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import pino from "pino";
import {BaseCondition, ComparisonOperator, ConditionGroup, LogicalOperator} from "../../queries/common/WhereClause";
// import {
//     BaseCondition,
//     ComparisonOperator,
//     ConditionGroup,
//     LogicalOperator
// } from "query-builder/queries/common/WhereClause";

type CompiledCondition = {
    sql: string;
    params: any[];
};

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

        const [name, alias] = left.trim().split(" AS ");

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
     */
    whereIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "IN", values, "AND");
    }

    /**
     * Adds a NOT IN condition connected with AND.
     */
    whereNotIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "NOT IN", values, "AND");
    }

    /**
     * Adds an IN condition connected with OR.
     */
    orWhereIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "IN", values, "OR");
    }

    /**
     * Adds a NOT IN condition connected with OR.
     */
    orWhereNotIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "NOT IN", values, "OR");
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
