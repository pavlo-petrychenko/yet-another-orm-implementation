import { PostgresQueryCompiler } from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import { CompiledQuery } from "@/drivers/postgres/dialect/types/CompiledQuery";
import { SQL } from "@/drivers/postgres/dialect/types/SQL";
import { Query } from "@/query-builder/queries/Query";
import { ColumnDescription } from "@/query-builder/queries/common/ColumnDecription";
import { JoinClause } from "@/query-builder/queries/common/JoinClause";
import { OrderByClause } from "@/query-builder/queries/common/OrderByClause";
import pino from "pino";

export class PostgresSelectCompiler extends PostgresQueryCompiler {
  private logger = pino({
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });
  compile(query: Query): CompiledQuery {
    const startTime = Date.now();
    // Log compilation details
    this.logger.debug(
      { query, timestamp: new Date().toISOString() },
      "Starting select query compilation"
    );
    try {
      const parts: string[] = [SQL.SELECT];
      const params: any = [];

      if (query.type !== "SELECT") {
        const error = new Error(`Invalid query type: ${query.type}`);
        this.logger.error(
          { query, error: error.message, stack: error.stack },
          "Select query compilation failed: "
        );
        throw error;
      }
      this.addColumns(parts, query.columns);
      this.addFromClause(parts, query.table);
      this.addJoinClause(parts, params, query.join);
      this.addWhereClause(parts, params, query.where);
      this.addOrderByClause(parts, query.orderBy);
      this.addLimitClause(parts, params, query.limit);
      this.addOffsetClause(parts, params, query.offset);

      const duration = Date.now() - startTime;
      // Log timing information
      this.logger.debug("Compilation completed in %dms", duration);
      this.logger.debug(
        { sql: parts.join(" "), params, duration },
        "Select query compiled successfully: "
      );
      return { sql: parts.join(" "), params };
    } catch (error) {
      if (error instanceof Error) {
        // Log error information
        this.logger.error(
          { query, error: error.message, stack: error.stack },
          "Failed to compile select query: "
        );
        throw error;
      }
      throw new Error("Unknown error occurred during select query compilation");
    }
  }

  private addColumns(parts: string[], columns: Array<ColumnDescription>): void {
    parts.push(
      columns.length > 0
        ? columns
            .map((col) => this.dialectUtils.escapeIdentifier(col))
            .join(", ")
        : "*"
    );
  }

  private addFromClause(parts: string[], table: string) {
    parts.push("FROM", this.dialectUtils.escapeIdentifier(table));
  }

  private addJoinClause(
    parts: string[],
    params: any[],
    joins: JoinClause[] | undefined
  ): void {
    if (!joins || joins.length === 0) {
      return;
    }
    joins.map((join) => {
      const joinType = join.type + " JOIN";
      const tableName = this.dialectUtils.escapeIdentifier(join.table);
      const onCondition = this.conditionCompiler.compile(join.on);
      params.push(...onCondition.params);
      parts.push(`${joinType} ${tableName} ON ${onCondition.sql}`);
    });
  }

  private addOrderByClause(
    parts: string[],
    order: OrderByClause | undefined
  ): void {
    if (!order) return;
    parts.push("ORDER BY");
    parts.push(
      order.orders
        .map((clause) => {
          `${this.dialectUtils.escapeIdentifier(clause.column)} ${
            clause.direction
          }`;
        })
        .join(", ")
    );
  }
}
