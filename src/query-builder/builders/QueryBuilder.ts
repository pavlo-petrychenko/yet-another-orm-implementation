import { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
import { InsertQueryBuilder } from "@/query-builder/builders/InsertQueryBuilder";
import { UpdateQueryBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
import { DeleteQueryBuilder } from "@/query-builder/builders/DeleteQueryBuilder";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";

export class QueryBuilder {
  select(...columns: ColumnDescription[]): SelectQueryBuilder {
    const builder = new SelectQueryBuilder();
    if (columns.length > 0) {
      builder.select(...columns);
    }
    return builder;
  }

  insert(): InsertQueryBuilder {
    return new InsertQueryBuilder();
  }

  update(): UpdateQueryBuilder {
    return new UpdateQueryBuilder();
  }

  delete(): DeleteQueryBuilder {
    return new DeleteQueryBuilder();
  }
}
