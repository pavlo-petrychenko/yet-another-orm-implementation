import type { IncludeConfig } from "@/model/types/IncludeConfig";
import type { OrderBy } from "@/model/types/OrderBy";
import type { Where } from "@/model/types/Where";

export interface FindArgs<T> {
  where?: Where<T>;
  orderBy?: OrderBy<T>;
  take?: number;
  skip?: number;
  include?: IncludeConfig<T>;
}

export type FindOneArgs<T> = FindArgs<T>;

export interface CountArgs<T> {
  where?: Where<T>;
}
