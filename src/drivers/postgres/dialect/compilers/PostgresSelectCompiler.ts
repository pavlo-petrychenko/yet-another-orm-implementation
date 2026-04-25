import type { ColumnDescription, RawExpression, SelectQuery } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { SelectCompiler } from "@/drivers/common/compilers/SelectCompiler";
import type { PostgresConditionCompiler } from "@/drivers/postgres/dialect/compilers/PostgresConditionCompiler";
import type { PostgresJoinCompiler } from "@/drivers/postgres/dialect/compilers/PostgresJoinCompiler";
import type { PostgresOrderByCompiler } from "@/drivers/postgres/dialect/compilers/PostgresOrderByCompiler";
import type { PostgresGroupByCompiler } from "@/drivers/postgres/dialect/compilers/PostgresGroupByCompiler";
import type { PostgresLimitCompiler } from "@/drivers/postgres/dialect/compilers/PostgresLimitCompiler";
import type { PostgresOffsetCompiler } from "@/drivers/postgres/dialect/compilers/PostgresOffsetCompiler";
import { substituteRawParams } from "@/drivers/postgres/dialect/utils/substituteRawParams";

export class PostgresSelectCompiler implements SelectCompiler {
  constructor(
    private readonly conditionCompiler: PostgresConditionCompiler,
    private readonly joinCompiler: PostgresJoinCompiler,
    private readonly orderByCompiler: PostgresOrderByCompiler,
    private readonly groupByCompiler: PostgresGroupByCompiler,
    private readonly limitCompiler: PostgresLimitCompiler,
    private readonly offsetCompiler: PostgresOffsetCompiler,
  ) {}

  compile(query: SelectQuery, ctx: CompilationContext): string {
    const parts: string[] = [];

    const distinct = query.distinct ? " DISTINCT" : "";
    parts.push(`SELECT${distinct} ${this.compileSelectList(query.columns, query.rawColumns, ctx)}`);
    parts.push(`FROM ${ctx.utils.qualifyTable(query.table)}`);

    if (query.join && query.join.length > 0) {
      for (const join of query.join) {
        parts.push(this.joinCompiler.compile(join, ctx));
      }
    }

    if (query.where) {
      parts.push(`WHERE ${this.conditionCompiler.compileTopLevel(query.where, ctx)}`);
    }

    if (query.groupBy) {
      parts.push(this.groupByCompiler.compile(query.groupBy, ctx));
    }

    if (query.having) {
      parts.push(`HAVING ${this.conditionCompiler.compileTopLevel(query.having, ctx)}`);
    }

    if (query.orderBy) {
      parts.push(this.orderByCompiler.compile(query.orderBy, ctx));
    }

    if (query.limit) {
      parts.push(this.limitCompiler.compile(query.limit, ctx));
    }

    if (query.offset) {
      parts.push(this.offsetCompiler.compile(query.offset, ctx));
    }

    let sql = parts.join(" ");

    if (query.unions && query.unions.length > 0) {
      for (const union of query.unions) {
        const keyword = union.all ? "UNION ALL" : "UNION";
        sql = `${sql} ${keyword} ${this.compile(union.query, ctx)}`;
      }
    }

    return sql;
  }

  private compileSelectList(
    columns: ColumnDescription[],
    rawColumns: RawExpression[] | undefined,
    ctx: CompilationContext,
  ): string {
    const items: string[] = [];

    for (const col of columns) {
      const qualified = ctx.utils.qualifyColumn(col);
      items.push(col.alias ? `${qualified} AS ${ctx.utils.escapeIdentifier(col.alias)}` : qualified);
    }

    if (rawColumns) {
      for (const raw of rawColumns) {
        items.push(substituteRawParams(raw.sql, raw.params, ctx.params));
      }
    }

    return items.length === 0 ? "*" : items.join(", ");
  }
}
