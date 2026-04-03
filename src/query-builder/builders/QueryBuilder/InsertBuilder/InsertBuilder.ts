import { Builder } from "@/query-builder/builders/QueryBuilder/Builder";
import { InsertQuery, QueryType, TableDescription } from "@/query-builder/types";

export class InsertBuilder implements Builder {
  table: TableDescription;
  
  build(): InsertQuery {
    return {
      type: QueryType.INSERT,
      table: this.table,
      values: [],
    }
  }
}