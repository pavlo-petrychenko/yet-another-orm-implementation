export interface QueryResult<TRow = Record<string, unknown>> {
  rows: TRow[];
  rowCount: number;
  insertId?: number | bigint;
  affectedRows?: number;
}
