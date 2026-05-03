// Internal abstraction over pg's Pool / Client. PostgresDriver delegates lifecycle and query
// execution here so the choice between pool and single-client (and any future variant) is a
// drop-in strategy implementation.
export interface PostgresConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query(sql: string, params: readonly unknown[]): Promise<PostgresQueryResponse>;
  // Pin a single physical connection for the duration of fn. Used to keep BEGIN/COMMIT and
  // every query in between on the same connection (Pool would otherwise check out a fresh
  // client per query).
  withPinnedClient<R>(fn: (pinned: PostgresConnection) => Promise<R>): Promise<R>;
}

export interface PostgresQueryResponse {
  rows: unknown[];
  rowCount: number | null;
}
