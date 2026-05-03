import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";

let current: DataSource | undefined;

export function setDataSource(ds: DataSource): void {
  current = ds;
}

export function getDataSource(): DataSource {
  if (!current) {
    throw new ModelError(
      "NO_DATA_SOURCE",
      "No DataSource has been set. Call setDataSource(...) before using repositories or AR statics.",
    );
  }
  return current;
}

export function clearDataSource(): void {
  current = undefined;
}
