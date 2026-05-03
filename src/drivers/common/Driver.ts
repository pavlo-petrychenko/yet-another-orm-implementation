import type { Query } from "@/query-builder";
import type { Dialect } from "@/drivers/common/Dialect";
import type { QueryResult } from "@/drivers/types/QueryResult";

export interface Driver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getDialect(): Dialect;
  query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>>;
  raw<TRow = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<TRow>>;
  // Run `fn` inside a transaction. Top-level call uses BEGIN/COMMIT (ROLLBACK on throw).
  // Nested calls within fn degrade to SAVEPOINT/RELEASE (ROLLBACK TO on throw).
  // The Driver passed to fn pins the underlying connection so every query lands inside the tx.
  withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R>;
}
