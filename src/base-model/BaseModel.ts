import {BaseModelStatic} from "@/base-model/BaseModelStatic";
import {WhereBuilder, SelectBuilder} from "@/query-builder";
import type {OrderDirection} from "@/query-builder";
import {Connection} from "@/connection/Connection";

export class BaseModel<T extends BaseModel<T>> extends BaseModelStatic<T> {
  public where(buildFn: (builder: WhereBuilder) => void): this {
    (this.queryBuilder as SelectBuilder).where(buildFn);
    return this;
  }

  public select(...columns: string[]): this {
    (this.queryBuilder as SelectBuilder).select(...columns);
    return this;
  }

  public limit(count: number): this {
    (this.queryBuilder as SelectBuilder).limit(count);
    return this;
  }

  public offset(count: number): this {
    (this.queryBuilder as SelectBuilder).offset(count);
    return this;
  }

  public groupBy(...columns: string[]): this {
    (this.queryBuilder as SelectBuilder).groupBy(...columns);
    return this;
  }

  public orderBy(column: string, direction: OrderDirection = "ASC"): this {
    (this.queryBuilder as SelectBuilder).orderBy(column, direction);
    return this;
  }

  public async execute(): Promise<T[]> {
    const query = this.queryBuilder.build();
    const result: T[] = await Connection.getInstance().getDriver().query(query);

    return result;
  }
}
