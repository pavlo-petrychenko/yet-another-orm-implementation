import type { BaseCondition, ColumnDescription, ConditionClause, ConditionGroup, RawCondition, SelectQuery } from "@/query-builder";
import { ConditionType, LogicalOperator, QueryType } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { ConditionCompiler } from "@/drivers/common/compilers/ConditionCompiler";
import { substituteRawParams } from "@/drivers/postgres/dialect/utils/substituteRawParams";

export class PostgresConditionCompiler implements ConditionCompiler {
  compile(clause: ConditionClause, ctx: CompilationContext): string {
    switch (clause.conditionType) {
      case ConditionType.Base:
        return this.compileBase(clause, ctx);
      case ConditionType.Group:
        return this.compileGroup(clause, ctx);
      case ConditionType.Raw:
        return this.compileRaw(clause, ctx);
    }
  }

  // Emits the body of a top-level condition without the outer parens that compileGroup adds.
  // Used by statement compilers for WHERE/HAVING so single-condition filters don't get wrapped.
  compileTopLevel(clause: ConditionClause, ctx: CompilationContext): string {
    if (clause.conditionType === ConditionType.Group) {
      return this.compileGroupBody(clause, ctx);
    }
    return this.compile(clause, ctx);
  }

  private compileBase(clause: BaseCondition, ctx: CompilationContext): string {
    const lhs = ctx.utils.qualifyColumn(clause.left);
    const op = clause.operator;

    if (op === "IS NULL" || op === "IS NOT NULL") {
      return `${lhs} ${op}`;
    }

    if (op === "IN" || op === "NOT IN") {
      const rhs = this.compileInRhs(clause.right, ctx);
      return `${lhs} ${op} ${rhs}`;
    }

    if (op === "BETWEEN" || op === "NOT BETWEEN") {
      const [min, max] = clause.right as [unknown, unknown];
      return `${lhs} ${op} ${ctx.params.add(min)} AND ${ctx.params.add(max)}`;
    }

    // Comparison / LIKE family.
    const rhs = this.compileScalarRhs(clause.right, clause.isColumnComparison ?? false, ctx);
    return `${lhs} ${op} ${rhs}`;
  }

  private compileScalarRhs(
    right: BaseCondition["right"],
    isColumnComparison: boolean,
    ctx: CompilationContext,
  ): string {
    if (isColumnComparison) {
      return ctx.utils.qualifyColumn(right as ColumnDescription);
    }
    if (this.isSelectQuery(right)) {
      return `(${ctx.compileSelect(right)})`;
    }
    return ctx.params.add(right);
  }

  private compileInRhs(right: BaseCondition["right"], ctx: CompilationContext): string {
    if (this.isSelectQuery(right)) {
      return `(${ctx.compileSelect(right)})`;
    }
    const values = right as readonly unknown[];
    if (values.length === 0) {
      // Empty IN list: emit (NULL) so the predicate matches no row (x IN (NULL) → unknown → false).
      return "(NULL)";
    }
    const placeholders = values.map((v) => ctx.params.add(v));
    return `(${placeholders.join(", ")})`;
  }

  private compileGroup(clause: ConditionGroup, ctx: CompilationContext): string {
    return `(${this.compileGroupBody(clause, ctx)})`;
  }

  private compileGroupBody(clause: ConditionGroup, ctx: CompilationContext): string {
    if (clause.conditions.length === 0) {
      return "";
    }
    return clause.conditions
      .map((child, idx) => {
        const compiled = this.compile(child, ctx);
        if (idx === 0) {
          return compiled;
        }
        const connector = child.connector ?? LogicalOperator.AND;
        return `${connector} ${compiled}`;
      })
      .join(" ");
  }

  private compileRaw(clause: RawCondition, ctx: CompilationContext): string {
    return substituteRawParams(clause.sql, clause.params, ctx.params);
  }

  private isSelectQuery(value: unknown): value is SelectQuery {
    return (
      typeof value === "object"
      && value !== null
      && "type" in value
      && (value as { type: unknown }).type === QueryType.SELECT
    );
  }
}
