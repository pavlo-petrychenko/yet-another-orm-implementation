import pino from "pino";
import {
  BaseCondition,
  ConditionGroup,
  RawCondition,
} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import {ClauseType} from "@/query-builder/types/clause/Clause";
import {ConditionType} from "@/query-builder/types/clause/ConditionClause/typedefs";
import {ComparisonOperator} from "@/query-builder/types/common/ComparisonOperator";
import {LogicalOperator} from "@/query-builder/types/common/LogicalOperator";

export class WhereBuilder {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: {colorize: true},
    },
  });

  private rootGroup: ConditionGroup = {
    type: ClauseType.Condition,
    conditionType: ConditionType.Group,
    conditions: [],
    connector: "AND",
  };

  private currentGroup: ConditionGroup = this.rootGroup;

  private addBaseCondition(
    left: string,
    operator: ComparisonOperator,
    right: string | number | (string | number)[],
    connector: LogicalOperator = "AND",
    isColumnComparison = false,
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

    if (Array.isArray(right) && right.length === 0 && (operator === "IN" || operator === "NOT IN")) {
      this.logger.warn({left, operator, right}, "Empty array passed to IN/NOT IN clause: ");
      throw new Error(`Empty array passed to '${operator}' clause`);
    }

    const condition: BaseCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left: {name, alias},
      operator,
      right,
      isColumnComparison,
    };

    this.logger.debug({condition}, "Added base condition to WHERE clause");

    this.currentGroup.conditions.push({...condition, connector});
    return this;
  }

  private addGroup(connector: LogicalOperator, buildFn: (builder: WhereBuilder) => void): this {
    const subBuilder = new WhereBuilder();
    buildFn(subBuilder);
    const group = subBuilder.build();

    this.logger.debug({group}, "Added condition group to WHERE clause");

    this.currentGroup.conditions.push({...group, connector});
    return this;
  }

  private addNullCondition(
    left: string,
    operator: "IS NULL" | "IS NOT NULL",
    connector: LogicalOperator = "AND",
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
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left: {name, alias},
      operator,
      right: null as any,
      isColumnComparison: false,
    };

    this.logger.debug({condition}, "Added null condition to WHERE clause");

    this.currentGroup.conditions.push({...condition, connector});
    return this;
  }

  private addSubqueryCondition(
    column: string,
    operator: "IN" | "NOT IN",
    callback: (qb: any) => any,
    connector: LogicalOperator,
  ): this {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {SelectBuilder} = require("@/query-builder/builders/SelectBuilder");
    const qb = new SelectBuilder();
    callback(qb);
    const subquery = qb.build();

    const [name, alias] = column.trim().split(/\s+[Aa][Ss]\s+/);

    const condition: BaseCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left: {name, alias},
      operator,
      right: subquery,
      isColumnComparison: false,
    };

    this.currentGroup.conditions.push({...condition, connector});
    return this;
  }

  private addRawCondition(sql: string, params: any[], connector: LogicalOperator): this {
    const condition: RawCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Raw,
      sql,
      params,
      connector,
    };
    this.currentGroup.conditions.push(condition);
    return this;
  }

  where(
    left: string,
    operator: ComparisonOperator,
    right: string | number | (string | number)[],
    isColumnComparison = false,
  ): this {
    return this.addBaseCondition(left, operator, right, "AND", isColumnComparison);
  }

  andWhere(
    left: string,
    operator: ComparisonOperator,
    right: string | number | (string | number)[],
    isColumnComparison = false,
  ): this {
    return this.addBaseCondition(left, operator, right, "AND", isColumnComparison);
  }

  orWhere(
    left: string,
    operator: ComparisonOperator,
    right: string | number | (string | number)[],
    isColumnComparison = false,
  ): this {
    return this.addBaseCondition(left, operator, right, "OR", isColumnComparison);
  }

  whereNot(
    left: string,
    operator: ComparisonOperator,
    right: string | number | (string | number)[],
    isColumnComparison = false,
  ): this {
    return this.addBaseCondition(left, operator, right, "AND NOT", isColumnComparison);
  }

  orWhereNot(
    left: string,
    operator: ComparisonOperator,
    right: string | number | (string | number)[],
    isColumnComparison = false,
  ): this {
    return this.addBaseCondition(left, operator, right, "OR NOT", isColumnComparison);
  }

  whereIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
    if (typeof values === "function") {
      return this.addSubqueryCondition(column, "IN", values, "AND");
    }
    return this.addBaseCondition(column, "IN", values, "AND");
  }

  whereNotIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
    if (typeof values === "function") {
      return this.addSubqueryCondition(column, "NOT IN", values, "AND");
    }
    return this.addBaseCondition(column, "NOT IN", values, "AND");
  }

  orWhereIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
    if (typeof values === "function") {
      return this.addSubqueryCondition(column, "IN", values, "OR");
    }
    return this.addBaseCondition(column, "IN", values, "OR");
  }

  orWhereNotIn(column: string, values: (string | number)[] | ((qb: any) => any)): this {
    if (typeof values === "function") {
      return this.addSubqueryCondition(column, "NOT IN", values, "OR");
    }
    return this.addBaseCondition(column, "NOT IN", values, "OR");
  }

  whereLike(column: string, pattern: string): this {
    return this.addBaseCondition(column, "LIKE", pattern, "AND");
  }

  orWhereLike(column: string, pattern: string): this {
    return this.addBaseCondition(column, "LIKE", pattern, "OR");
  }

  whereNotLike(column: string, pattern: string): this {
    return this.addBaseCondition(column, "NOT LIKE", pattern, "AND");
  }

  whereILike(column: string, pattern: string): this {
    return this.addBaseCondition(column, "ILIKE", pattern, "AND");
  }

  orWhereILike(column: string, pattern: string): this {
    return this.addBaseCondition(column, "ILIKE", pattern, "OR");
  }

  whereNotILike(column: string, pattern: string): this {
    return this.addBaseCondition(column, "NOT ILIKE", pattern, "AND");
  }

  whereBetween(column: string, min: string | number, max: string | number): this {
    return this.addBaseCondition(column, "BETWEEN", [min, max], "AND");
  }

  orWhereBetween(column: string, min: string | number, max: string | number): this {
    return this.addBaseCondition(column, "BETWEEN", [min, max], "OR");
  }

  whereNotBetween(column: string, min: string | number, max: string | number): this {
    return this.addBaseCondition(column, "NOT BETWEEN", [min, max], "AND");
  }

  orWhereNotBetween(column: string, min: string | number, max: string | number): this {
    return this.addBaseCondition(column, "NOT BETWEEN", [min, max], "OR");
  }

  whereNull(column: string): this {
    return this.addNullCondition(column, "IS NULL", "AND");
  }

  orWhereNull(column: string): this {
    return this.addNullCondition(column, "IS NULL", "OR");
  }

  whereNotNull(column: string): this {
    return this.addNullCondition(column, "IS NOT NULL", "AND");
  }

  orWhereNotNull(column: string): this {
    return this.addNullCondition(column, "IS NOT NULL", "OR");
  }

  whereRaw(sql: string, params: any[] = []): this {
    return this.addRawCondition(sql, params, "AND");
  }

  orWhereRaw(sql: string, params: any[] = []): this {
    return this.addRawCondition(sql, params, "OR");
  }

  group(connector: LogicalOperator, buildFn: (builder: WhereBuilder) => void): this {
    return this.addGroup(connector, buildFn);
  }

  build(): ConditionGroup {
    this.logger.debug({rootGroup: this.rootGroup}, "Built final condition group");
    return this.rootGroup;
  }
}
