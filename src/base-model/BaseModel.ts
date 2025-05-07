// import {BaseModelStatic} from "@/base-model/BaseModelStatic";
// import {QueryBuilder} from "@/query-builder/builder/QueryBuilder";
// import {SelectQueryBuilder} from "@/query-builder/builder/select/SelectQueryBuilder";
// import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
// import {OrderDirection} from "@/query-builder/queries/common/OrderByClause";
// import {Connection} from "@/connection/Connection";

import {BaseModelStatic} from "./BaseModelStatic";
import {WhereClauseBuilder} from "../query-builder/builder/common/WhereClauseBuilder";
import {SelectQueryBuilder} from "../query-builder/builder/select/SelectQueryBuilder";
import {OrderDirection} from "../query-builder/queries/common/OrderByClause";
import {Connection} from "../connection/Connection";

export class BaseModel<T extends BaseModel<T>> extends BaseModelStatic<T>{

    public where(buildFn: (builder: WhereClauseBuilder) => void) : this{
        (this.queryBuilder as SelectQueryBuilder).where(buildFn)
        return this;
    }

    public select(...columns: string[]) : this{
        (this.queryBuilder as SelectQueryBuilder).select(...columns)
        return this;
    }

    public limit(count: number) : this{
        (this.queryBuilder as SelectQueryBuilder).limit(count)
        return this;
    }

    public offset(count: number) : this{
        (this.queryBuilder as SelectQueryBuilder).offset(count)
        return this;
    }

    public groupBy(...columns: string[]) : this{
        (this.queryBuilder as SelectQueryBuilder).groupBy(...columns)
        return this;
    }

    public orderBy(column: string, direction: OrderDirection = "ASC") : this{
        (this.queryBuilder as SelectQueryBuilder).orderBy(column, direction)
        return this;
    }


    public async execute() : Promise<T[]>{
        const query = this.queryBuilder.build();
        const result : T[] = await Connection.getInstance().getDriver().query(query)

        return result;
    }



}
