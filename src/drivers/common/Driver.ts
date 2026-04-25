import type { Query } from "@/query-builder";
import type { Dialect } from "@/drivers/common/Dialect";
import type { QueryResult } from "@/drivers/types/QueryResult";

export interface Driver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getDialect(): Dialect;
  query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>>;
}
