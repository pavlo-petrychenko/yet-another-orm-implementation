import { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
import { InsertQueryBuilder } from "@/query-builder/builders/InsertQueryBuilder";
import { UpdateQueryBuilder } from "@/query-builder/builders/UpdateQueryBuilder";
import { DeleteQueryBuilder } from "@/query-builder/builders/DeleteQueryBuilder";
import type { TableDescription } from "@/query-builder/types/common/TableDescription";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";

export class QueryBuilder {
  select(table: TableDescription, ...columns: ColumnDescription[]): SelectQueryBuilder {
    const builder = new SelectQueryBuilder({ table });
    if (columns.length > 0) {
      builder.select(...columns);
    }
    return builder;
  }

  insert(table: TableDescription): InsertQueryBuilder {
    return new InsertQueryBuilder({ table });
  }

  update(table: TableDescription): UpdateQueryBuilder {
    return new UpdateQueryBuilder({ table });
  }

  delete(table: TableDescription): DeleteQueryBuilder {
    return new DeleteQueryBuilder({ table });
  }
}
