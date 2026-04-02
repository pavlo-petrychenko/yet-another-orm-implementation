import {WhereBuilder} from "@/query-builder/builders/WhereBuilder";
import {SelectBuilder} from "@/query-builder/builders/SelectBuilder";
import {InsertBuilder} from "@/query-builder/builders/InsertBuilder";
import {UpdateBuilder} from "@/query-builder/builders/UpdateBuilder";
import {DeleteBuilder} from "@/query-builder/builders/DeleteBuilder";

export class QueryBuilder {
  findOne(condition: (builder: WhereBuilder) => void): SelectBuilder {
    return new SelectBuilder().select().where(condition).limit(1);
  }

  findAll(condition: (builder: WhereBuilder) => void): SelectBuilder {
    return new SelectBuilder().select().where(condition);
  }

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
