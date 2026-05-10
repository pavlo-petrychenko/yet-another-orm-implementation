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
import {
  PostgresAlterTableCompiler,
  PostgresColumnTypeCompiler,
  PostgresCreateTableCompiler,
  PostgresDropTableCompiler,
  PostgresRenameTableCompiler,
} from "@/drivers/postgres/dialect/compilers/ddl";
import type { DdlQuery } from "@/schema-builder/types/DdlQuery";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";

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

  private readonly columnTypeCompiler = new PostgresColumnTypeCompiler();
  private readonly createTableCompiler = new PostgresCreateTableCompiler(this.columnTypeCompiler);
  private readonly alterTableCompiler = new PostgresAlterTableCompiler(this.columnTypeCompiler);
  private readonly dropTableCompiler = new PostgresDropTableCompiler();
  private readonly renameTableCompiler = new PostgresRenameTableCompiler();

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

  buildDdl(query: DdlQuery): CompiledQuery {
    const params = this.createParameterManager();
    const ctx: CompilationContext = {
      params,
      utils: this.utils,
      compileCondition: () => {
        throw new Error("DDL compilation does not support conditions");
      },
      compileSelect: () => {
        throw new Error("DDL compilation does not support nested SELECTs");
      },
    };
    const sql = this.dispatchDdl(query, ctx);
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

  private dispatchDdl(query: DdlQuery, ctx: CompilationContext): string {
    switch (query.type) {
      case DdlQueryType.CREATE_TABLE:
        return this.createTableCompiler.compile(query, ctx);
      case DdlQueryType.ALTER_TABLE:
        return this.alterTableCompiler.compile(query, ctx);
      case DdlQueryType.DROP_TABLE:
        return this.dropTableCompiler.compile(query, ctx);
      case DdlQueryType.RENAME_TABLE:
        return this.renameTableCompiler.compile(query, ctx);
    }
  }
}
