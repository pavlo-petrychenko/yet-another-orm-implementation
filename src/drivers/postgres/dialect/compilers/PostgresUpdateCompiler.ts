import { PostgresQueryCompiler } from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import { CompiledQuery } from "@/drivers/postgres/dialect/types/CompiledQuery";
import { SQL } from "@/drivers/postgres/dialect/types/SQL";
import { Query } from "@/query-builder/queries/Query";
import pino from "pino";

export class PostgresUpdateCompiler extends PostgresQueryCompiler {
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
      "Starting update query compilation"
    );
    try {
      const parts: string[] = [SQL.UPDATE];
      const params: any[] = [];

      if (query.type !== "UPDATE") {
        const error = new Error(`Invalid query type ${query.type}`);
        this.logger.error(
          { query, error: error.message, stack: error.stack },
          "Update query compilation failed: "
        );
        throw error;
      }

      this.addTable(parts, query.table);
      this.addSetClause(parts, params, query.values);
      this.addWhereClause(parts, params, query.where);
      this.addReturningClause(parts, query.returning);
      this.addLimitClause(parts, params, query.limit);
      this.addOffsetClause(parts, params, query.offset);

      const duration = Date.now() - startTime;
      // Log timing information
      this.logger.debug("Compilation completed in %dms", duration);
      this.logger.debug(
        { sql: parts.join(" "), params, duration },
        "Update query compiled successfully: "
      );
      return { sql: parts.join(" "), params };
    } catch (error) {
      if (error instanceof Error) {
        // Log error information
        this.logger.error(
          { query, error: error.message, stack: error.stack },
          "Failed to compile update query: "
        );
        throw error;
      }
      throw new Error("Unknown error occurred during update query compilation");
    }
  }

  private addSetClause(
    parts: string[],
    params: any[],
    values: Record<string, any> | undefined
  ): void {
    if (!values) {
      this.logger.debug("No values provided for UPDATE");
      return;
    }

    this.logger.debug({ values }, "Adding values to UPDATE query");

    const sets = Object.entries(values).map(([key, _]) => {
      return `${this.dialectUtils.escapeIdentifier(
        key
      )} = ${this.paramManager.getNextParameter()}`;
    });
    parts.push(`SET ${sets.join(", ")}`);
    params.push(...Object.values(values));
  }
}
