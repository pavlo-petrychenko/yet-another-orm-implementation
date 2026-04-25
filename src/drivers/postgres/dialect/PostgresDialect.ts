import type { Query, SelectQuery } from "@/query-builder";
import { QueryType } from "@/query-builder";
import type { Dialect } from "@/drivers/common/Dialect";
import type { CompiledQuery } from "@/drivers/types/CompiledQuery";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import { PostgresParameterManager } from "@/drivers/postgres/dialect/PostgresParameterManager";
import { PostgresDialectUtils } from "@/drivers/postgres/dialect/PostgresDialectUtils";
import {
  PostgresConditionCompiler,
  PostgresDeleteCompiler,
  PostgresGroupByCompiler,
  PostgresInsertCompiler,
  PostgresJoinCompiler,
  PostgresLimitCompiler,
  PostgresOffsetCompiler,
  PostgresOrderByCompiler,
  PostgresReturningCompiler,
  PostgresSelectCompiler,
  PostgresUpdateCompiler,
} from "@/drivers/postgres/dialect/compilers";

export class PostgresDialect implements Dialect {
  private readonly utils = new PostgresDialectUtils();
  private readonly conditionCompiler = new PostgresConditionCompiler();
  private readonly joinCompiler = new PostgresJoinCompiler();
  private readonly orderByCompiler = new PostgresOrderByCompiler();
  private readonly groupByCompiler = new PostgresGroupByCompiler();
  private readonly limitCompiler = new PostgresLimitCompiler();
  private readonly offsetCompiler = new PostgresOffsetCompiler();
  private readonly returningCompiler = new PostgresReturningCompiler();

  private readonly selectCompiler = new PostgresSelectCompiler(
    this.conditionCompiler,
    this.joinCompiler,
    this.orderByCompiler,
    this.groupByCompiler,
    this.limitCompiler,
    this.offsetCompiler,
  );
  private readonly insertCompiler = new PostgresInsertCompiler(this.returningCompiler);
  private readonly updateCompiler = new PostgresUpdateCompiler(this.conditionCompiler, this.returningCompiler);
  private readonly deleteCompiler = new PostgresDeleteCompiler(this.conditionCompiler, this.returningCompiler);

  buildQuery(query: Query): CompiledQuery {
    const params = this.createParameterManager();
    const ctx: CompilationContext = {
      params,
      utils: this.utils,
      compileCondition: (clause) => this.conditionCompiler.compile(clause, ctx),
      compileSelect: (sub: SelectQuery) => this.selectCompiler.compile(sub, ctx),
    };
    const sql = this.dispatch(query, ctx);
    return { sql, params: params.getParams() };
  }

  getUtils(): PostgresDialectUtils {
    return this.utils;
  }

  createParameterManager(): PostgresParameterManager {
    return new PostgresParameterManager();
  }

  private dispatch(query: Query, ctx: CompilationContext): string {
    switch (query.type) {
      case QueryType.SELECT:
        return this.selectCompiler.compile(query, ctx);
      case QueryType.INSERT:
        return this.insertCompiler.compile(query, ctx);
      case QueryType.UPDATE:
        return this.updateCompiler.compile(query, ctx);
      case QueryType.DELETE:
        return this.deleteCompiler.compile(query, ctx);
    }
  }
}
