export { DataSource } from "@/model/DataSource";
export { Repository } from "@/model/Repository";
export { BaseModel } from "@/model/BaseModel";
export { setDataSource, getDataSource, clearDataSource } from "@/model/dataSourceRegistry";
export { repositoryRegistry } from "@/model/repositoryRegistry";
export type { RepositoryCtor } from "@/model/repositoryRegistry";
export { ModelError } from "@/model/errors/ModelError";
export type { ModelErrorCode } from "@/model/errors/ModelError";
export type {
  Where,
  WhereOperators,
  ScalarKeys,
  OrderBy,
  SortDirection,
  FindArgs,
  FindOneArgs,
  CountArgs,
  DataSourceOptions,
  Relation,
  IncludeConfig,
  RelationTarget,
} from "@/model/types";
