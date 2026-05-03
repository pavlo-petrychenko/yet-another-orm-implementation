import { ClauseType } from "@/query-builder/types/clause/Clause";
import { ConditionType } from "@/query-builder/types/clause/ConditionClause/typedefs";
import type {
  BaseCondition,
  ConditionClause,
  ConditionGroup,
  RawCondition,
} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import type { ComparisonOperator } from "@/query-builder/types/common/ComparisonOperator";
import { LogicalOperator } from "@/query-builder/types/common/LogicalOperator";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";

type ConditionRight = ColumnDescription | ScalarParam | ScalarParam[];

export class ConditionBuilder {
  private conditions: ConditionClause[] = [];

  // --- Base conditions ---

  where(
    left: ColumnDescription,
    operator: ComparisonOperator,
    right: ConditionRight,
    isColumnComparison?: boolean,
  ): this {
    return this.addCondition(left, operator, right, undefined, isColumnComparison);
  }

  andWhere(
    left: ColumnDescription,
    operator: ComparisonOperator,
    right: ConditionRight,
    isColumnComparison?: boolean,
  ): this {
    return this.addCondition(left, operator, right, LogicalOperator.AND, isColumnComparison);
  }

  orWhere(
    left: ColumnDescription,
    operator: ComparisonOperator,
    right: ConditionRight,
    isColumnComparison?: boolean,
  ): this {
    return this.addCondition(left, operator, right, LogicalOperator.OR, isColumnComparison);
  }

  whereNot(
    left: ColumnDescription,
    operator: ComparisonOperator,
    right: ConditionRight,
    isColumnComparison?: boolean,
  ): this {
    return this.addCondition(left, operator, right, LogicalOperator.AND_NOT, isColumnComparison);
  }

  orWhereNot(
    left: ColumnDescription,
    operator: ComparisonOperator,
    right: ConditionRight,
    isColumnComparison?: boolean,
  ): this {
    return this.addCondition(left, operator, right, LogicalOperator.OR_NOT, isColumnComparison);
  }

  // --- Convenience: IN / NOT IN ---

  whereIn(column: ColumnDescription, values: ScalarParam[]): this {
    return this.addCondition(column, "IN", values, this.nextConnector());
  }

  whereNotIn(column: ColumnDescription, values: ScalarParam[]): this {
    return this.addCondition(column, "NOT IN", values, this.nextConnector());
  }

  orWhereIn(column: ColumnDescription, values: ScalarParam[]): this {
    return this.addCondition(column, "IN", values, LogicalOperator.OR);
  }

  orWhereNotIn(column: ColumnDescription, values: ScalarParam[]): this {
    return this.addCondition(column, "NOT IN", values, LogicalOperator.OR);
  }

  // --- Convenience: LIKE / ILIKE ---

  whereLike(column: ColumnDescription, pattern: string): this {
    return this.addCondition(column, "LIKE", pattern, this.nextConnector());
  }

  orWhereLike(column: ColumnDescription, pattern: string): this {
    return this.addCondition(column, "LIKE", pattern, LogicalOperator.OR);
  }

  whereNotLike(column: ColumnDescription, pattern: string): this {
    return this.addCondition(column, "NOT LIKE", pattern, this.nextConnector());
  }

  whereILike(column: ColumnDescription, pattern: string): this {
    return this.addCondition(column, "ILIKE", pattern, this.nextConnector());
  }

  orWhereILike(column: ColumnDescription, pattern: string): this {
    return this.addCondition(column, "ILIKE", pattern, LogicalOperator.OR);
  }

  whereNotILike(column: ColumnDescription, pattern: string): this {
    return this.addCondition(column, "NOT ILIKE", pattern, this.nextConnector());
  }

  // --- Convenience: BETWEEN ---

  whereBetween(column: ColumnDescription, min: ScalarParam, max: ScalarParam): this {
    return this.addCondition(column, "BETWEEN", [min, max], this.nextConnector());
  }

  orWhereBetween(column: ColumnDescription, min: ScalarParam, max: ScalarParam): this {
    return this.addCondition(column, "BETWEEN", [min, max], LogicalOperator.OR);
  }

  whereNotBetween(column: ColumnDescription, min: ScalarParam, max: ScalarParam): this {
    return this.addCondition(column, "NOT BETWEEN", [min, max], this.nextConnector());
  }

  orWhereNotBetween(column: ColumnDescription, min: ScalarParam, max: ScalarParam): this {
    return this.addCondition(column, "NOT BETWEEN", [min, max], LogicalOperator.OR);
  }

  // --- Convenience: NULL ---

  whereNull(column: ColumnDescription): this {
    return this.addNullCondition(column, "IS NULL", this.nextConnector());
  }

  orWhereNull(column: ColumnDescription): this {
    return this.addNullCondition(column, "IS NULL", LogicalOperator.OR);
  }

  whereNotNull(column: ColumnDescription): this {
    return this.addNullCondition(column, "IS NOT NULL", this.nextConnector());
  }

  orWhereNotNull(column: ColumnDescription): this {
    return this.addNullCondition(column, "IS NOT NULL", LogicalOperator.OR);
  }

  // --- Raw ---

  whereRaw(sql: string, params: any[] = []): this {
    const raw: RawCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Raw,
      sql,
      params,
      connector: this.nextConnector(),
    };
    this.conditions.push(raw);
    return this;
  }

  orWhereRaw(sql: string, params: any[] = []): this {
    const raw: RawCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Raw,
      sql,
      params,
      connector: LogicalOperator.OR,
    };
    this.conditions.push(raw);
    return this;
  }

  // --- Grouping ---

  group(connector: LogicalOperator, callback: (builder: ConditionBuilder) => void): this {
    const nested = new ConditionBuilder();
    callback(nested);
    const group: ConditionGroup = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Group,
      conditions: nested.conditions,
      connector,
    };
    this.conditions.push(group);
    return this;
  }

  // --- Build ---

  build(): ConditionGroup {
    return {
      type: ClauseType.Condition,
      conditionType: ConditionType.Group,
      conditions: this.conditions,
    };
  }

  // --- Private helpers ---

  private addCondition(
    left: ColumnDescription,
    operator: ComparisonOperator,
    right: ConditionRight,
    connector?: LogicalOperator,
    isColumnComparison?: boolean,
  ): this {
    const condition: BaseCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left,
      operator,
      right,
      ...(connector !== undefined && { connector }),
      ...(isColumnComparison !== undefined && { isColumnComparison }),
    };
    this.conditions.push(condition);
    return this;
  }

  private addNullCondition(
    column: ColumnDescription,
    operator: "IS NULL" | "IS NOT NULL",
    connector?: LogicalOperator,
  ): this {
    const condition: BaseCondition = {
      type: ClauseType.Condition,
      conditionType: ConditionType.Base,
      left: column,
      operator,
      right: null,
      ...(connector !== undefined && { connector }),
    };
    this.conditions.push(condition);
    return this;
  }

  private nextConnector(): LogicalOperator | undefined {
    return this.conditions.length === 0 ? undefined : LogicalOperator.AND;
  }
}
