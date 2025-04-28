import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";
import {GroupByBuilder} from "@/query-builder/builder/common/GroupByClauseBuilder";
import {OrderByBuilder} from "@/query-builder/builder/common/OrderByClauseBuilder";
import {OffsetBuilder} from "@/query-builder/builder/common/OffsetClauseBuilder";
import {LimitBuilder} from "@/query-builder/builder/common/LimitClauseBuilder";
import {OrderDirection} from "@/query-builder/queries/common/OrderByClause";
import {QueryDescription} from "@/query-builder/queries/common/CommonQueryDescription";
import {JoinClauseBuilder} from "@/query-builder/builder/common/JoinClauseBuilder";


export abstract class ClauseMixin {
    protected whereBuilder = new WhereClauseBuilder();
    protected groupByBuilder = new GroupByBuilder();
    protected orderByBuilder = new OrderByBuilder();
    protected limitBuilder = new LimitBuilder();
    protected offsetBuilder = new OffsetBuilder();
    protected joinBuilder = new JoinClauseBuilder();

    where(callback: (builder: WhereClauseBuilder) => void): this {
        callback(this.whereBuilder);
        return this;
    }

    groupBy(...columns: string[]): this {
        columns.forEach(c => this.groupByBuilder.add(c));
        return this;
    }

    orderBy(column: string, direction: OrderDirection = "ASC"): this {
        this.orderByBuilder.add(column, direction);
        return this;
    }

    limit(count: number): this {
        this.limitBuilder.set(count);
        return this;
    }

    offset(count: number): this {
        this.offsetBuilder.set(count);
        return this;
    }

    innerJoin(table: string,
              on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.join(table, on)
        return this;
    }

    leftJoin(table: string,
             on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.leftJoin(table, on)
        return this;
    }

    rightJoin(table: string,
              on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.rightJoin(table, on)
        return this;
    }

    fullJoin(table: string,
             on: (builder: WhereClauseBuilder) => WhereClauseBuilder) {
        this.joinBuilder.fullJoin(table, on)
        return this;
    }


    protected buildCommonClauses(): Partial<QueryDescription> {
        const where = this.whereBuilder.build();
        return {
            where: where.conditions.length > 0 ? where : undefined,
            groupBy: this.groupByBuilder.build() || undefined,
            orderBy: this.orderByBuilder.build() || undefined,
            limit: this.limitBuilder.build() || undefined,
            offset: this.offsetBuilder.build() || undefined,
            join : this.joinBuilder.build() || undefined
        };
    }
}
