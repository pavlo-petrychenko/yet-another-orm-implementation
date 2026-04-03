import { Builder } from "@/query-builder/builders/QueryBuilder/Builder";
import { QueryType, TableDescription, UpdateQuery } from "@/query-builder/types";

export class UpdateBuilder implements Builder {
  table: TableDescription;
  
  build(): UpdateQuery {
    return {
      type: QueryType.UPDATE,
      table: this.table,
      values: {},
    }
  }
  
}