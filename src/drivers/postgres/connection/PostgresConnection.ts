// Internal abstraction over pg's Pool / Client. PostgresDriver delegates lifecycle and query
// execution here so the choice between pool and single-client (and any future variant) is a
// drop-in strategy implementation.
export interface PostgresConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query(sql: string, params: readonly unknown[]): Promise<PostgresQueryResponse>;
}

export interface PostgresQueryResponse {
  rows: unknown[];
  rowCount: number | null;
}
