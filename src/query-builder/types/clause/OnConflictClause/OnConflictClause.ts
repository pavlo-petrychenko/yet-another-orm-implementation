// Conflict-resolution strategy for an INSERT.
// - "do-nothing" → ON CONFLICT (...) DO NOTHING
// - "all-non-conflict" → DO UPDATE SET <every inserted column not in targetColumns>
// - string[] → DO UPDATE SET <listed columns> = EXCLUDED.<col>
export type OnConflictUpdate =
  | "do-nothing"
  | "all-non-conflict"
  | string[];

export interface OnConflictClause {
  targetColumns: string[];
  updateColumns: OnConflictUpdate;
}
