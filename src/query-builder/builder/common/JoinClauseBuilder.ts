import {JoinClause, JoinType} from "@/query-builder/queries/common/JoinClause";
import {WhereClauseBuilder} from "@/query-builder/builder/common/WhereClauseBuilder";

export class JoinClauseBuilder {
    private joins: JoinClause[] = [];

    join(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("INNER", table, on, alias);
    }

    leftJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("LEFT", table, on, alias);
    }

    rightJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("RIGHT", table, on, alias);
    }

    fullJoin(
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        return this.addJoin("FULL", table, on, alias);
    }

    private addJoin(
        type: JoinType,
        table: string,
        on: (builder: WhereClauseBuilder) => WhereClauseBuilder,
        alias?: string
    ): this {
        const builder = on(new WhereClauseBuilder());
        this.joins.push({
            type,
            table,
            on: builder.build()
        });
        return this;
    }

    build(): JoinClause[] {
        return this.joins;
    }
}
