import type { EntityTarget } from "@/metadata/types";
import { getDataSource } from "@/model/dataSourceRegistry";
import type { Repository } from "@/model/Repository";

export function makeRepository<T extends object>(entity: EntityTarget<T>): Repository<T> {
  return getDataSource().getRepository(entity);
}
