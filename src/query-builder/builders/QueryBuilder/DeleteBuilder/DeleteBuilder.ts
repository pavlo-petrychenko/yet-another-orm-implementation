import { Builder } from "@/query-builder/builders/QueryBuilder/Builder";
import { DeleteQuery, QueryType, TableDescription } from "@/query-builder";

export class DeleteBuilder implements Builder {
  table: TableDescription;
  
  build(): DeleteQuery {
    return {
      type: QueryType.DELETE,
      table: this.table,
    }
  }
}