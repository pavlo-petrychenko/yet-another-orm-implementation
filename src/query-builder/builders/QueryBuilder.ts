import { DeleteBuilder } from "@/query-builder/builders/QueryBuilder/DeleteBuilder/DeleteBuilder";
import { InsertBuilder } from "@/query-builder/builders/QueryBuilder/InsertBuilder/InsertBuilder";
import { SelectBuilder } from "@/query-builder/builders/QueryBuilder/SelectBuilder/SelectBuilder";
import { UpdateBuilder } from "@/query-builder/builders/QueryBuilder/UpdateBuilder/UpdateBuilder";

export class QueryBuilder {
  select(): SelectBuilder {
    return new SelectBuilder();
  }
  
  insert(): InsertBuilder {
    return new InsertBuilder();
  }
  
  update(): UpdateBuilder { 
    return new UpdateBuilder();
  }
  
  delete(): DeleteBuilder {
    return new DeleteBuilder();
  }
}
