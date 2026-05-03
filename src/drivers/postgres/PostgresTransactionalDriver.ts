import type { Query } from "@/query-builder";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import type { QueryResult } from "@/drivers/types/QueryResult";
import type { PostgresConnection } from "@/drivers/postgres/connection/PostgresConnection";
import type { PostgresDialect } from "@/drivers/postgres/dialect/PostgresDialect";

// Internal driver scoped to a single pinned connection inside an open transaction.
// `depth` tracks SAVEPOINT nesting: 0 ⇒ BEGIN/COMMIT/ROLLBACK; ≥ 1 ⇒ SAVEPOINT/RELEASE/ROLLBACK TO.
export class PostgresTransactionalDriver implements Driver {
  constructor(
    private readonly dialect: PostgresDialect,
    private readonly connection: PostgresConnection,
    private readonly depth: number,
  ) {}

  connect(): Promise<void> { return Promise.resolve(); }
  disconnect(): Promise<void> { return Promise.resolve(); }
  isConnected(): boolean { return true; }

  getDialect(): Dialect {
    return this.dialect;
  }

  async query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>> {
    const compiled = this.dialect.buildQuery(query);
    const result = await this.connection.query(compiled.sql, compiled.params);
    return {
      rows: result.rows as TRow[],
      rowCount: result.rowCount ?? 0,
    };
  }

  async raw<TRow = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<QueryResult<TRow>> {
    const result = await this.connection.query(sql, params);
    return {
      rows: result.rows as TRow[],
      rowCount: result.rowCount ?? 0,
    };
  }

  async withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R> {
    const childDepth = this.depth + 1;
    const savepoint = `sp_${String(childDepth)}`;
    await this.connection.query(`SAVEPOINT ${savepoint}`, []);
    const child = new PostgresTransactionalDriver(this.dialect, this.connection, childDepth);
    try {
      const result = await fn(child);
      await this.connection.query(`RELEASE SAVEPOINT ${savepoint}`, []);
      return result;
    } catch (err) {
      await this.connection.query(`ROLLBACK TO SAVEPOINT ${savepoint}`, []);
      await this.connection.query(`RELEASE SAVEPOINT ${savepoint}`, []);
      throw err;
    }
  }
}
