import {
    BaseCondition,
    ComparisonOperator, ConditionClause,
    ConditionGroup,
    LogicalOperator
} from "@/query-builder/queries/common/WhereClause";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

type CompiledCondition = {
    sql: string;
    params: any[];
};


export class WhereClauseBuilder {
    private rootGroup: ConditionGroup = {
        type: "group",
        conditions: [],
        connector: "AND"
    };

    private currentGroup: ConditionGroup = this.rootGroup;

    private addBaseCondition(
        left: string,
        operator: ComparisonOperator,
        right: string | number | (string | number)[],
        connector: LogicalOperator = "AND",
        isColumnComparison = false
    ): this {
        const [name, alias] = left.trim().split(' AS ')
        const condition: BaseCondition = {
            type: "condition",
            left : {name, alias},
            operator,
            right,
            isColumnComparison
        };

        this.currentGroup.conditions.push({ ...condition, connector });
        return this;
    }

    private addGroup(connector: LogicalOperator, buildFn: (builder: WhereClauseBuilder) => void): this {
        const subBuilder = new WhereClauseBuilder();
        buildFn(subBuilder);
        const group = subBuilder.build();

        this.currentGroup.conditions.push({ ...group, connector });
        return this;
    }

    where(left: string, operator: ComparisonOperator, right: string | number | (string | number)[], isColumnComparison = false): this {
        return this.addBaseCondition(left, operator, right, "AND", isColumnComparison);
    }

    andWhere(left: string, operator: ComparisonOperator, right: string | number | (string | number)[], isColumnComparison = false): this {
        return this.addBaseCondition(left, operator, right, "AND", isColumnComparison);
    }

    orWhere(left: string, operator: ComparisonOperator, right: string | number | (string | number)[], isColumnComparison = false): this {
        return this.addBaseCondition(left, operator, right, "OR", isColumnComparison);
    }

    whereNot(left: string, operator: ComparisonOperator, right: string | number | (string | number)[], isColumnComparison = false): this {
        return this.addBaseCondition(left, operator, right, "AND NOT", isColumnComparison);
    }

    orWhereNot(left: string, operator: ComparisonOperator, right: string | number | (string | number)[], isColumnComparison = false): this {
        return this.addBaseCondition(left, operator, right, "OR NOT", isColumnComparison);
    }

    whereIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "IN", values, "AND");
    }

    whereNotIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "NOT IN", values, "AND");
    }

    orWhereIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "IN", values, "OR");
    }

    orWhereNotIn(column: string, values: (string | number)[]): this {
        return this.addBaseCondition(column, "NOT IN", values, "OR");
    }

    group(connector: LogicalOperator, buildFn: (builder: WhereClauseBuilder) => void): this {
        return this.addGroup(connector, buildFn);
    }

    build(): ConditionGroup {
        return this.rootGroup;
    }


}
