import { DeleteBuilder } from "@/query-builder/builders/DeleteBuilder/DeleteBuilder";
import { InsertBuilder } from "@/query-builder/builders/InsertBuilder/InsertBuilder";
import { SelectBuilder } from "@/query-builder/builders/SelectBuilder/SelectBuilder";
import { UpdateBuilder } from "@/query-builder/builders/UpdateBuilder/UpdateBuilder";


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

