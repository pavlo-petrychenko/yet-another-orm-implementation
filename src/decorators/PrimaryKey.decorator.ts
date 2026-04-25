import { Column } from "@/decorators/Column.decorator";
import type { ColumnOptions } from "@/metadata/types";

export const PrimaryKey = <V = unknown>(options: ColumnOptions = {}): ReturnType<typeof Column<V>> => {
  return Column<V>({ ...options, primary: true });
};
