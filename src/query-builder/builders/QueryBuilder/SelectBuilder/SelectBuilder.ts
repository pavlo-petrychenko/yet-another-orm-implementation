import { Builder } from "@/query-builder/builders/QueryBuilder/Builder";
import { QueryType, SelectQuery, TableDescription } from "@/query-builder/types";

export class SelectBuilder implements Builder {
  table: TableDescription;
  
  build(): SelectQuery {
    return {
      type: QueryType.SELECT,
      table: this.table,
      columns: []
    }
  }
}