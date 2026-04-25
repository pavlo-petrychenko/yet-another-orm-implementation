import { Column } from "@/decorators/Column.decorator";
import type { ColumnOptions } from "@/metadata/types";

export const PrimaryKey = <V>(options: ColumnOptions<V> = {}): ReturnType<typeof Column<V>> => {
  return Column<V>({ ...options, primary: true });
};
