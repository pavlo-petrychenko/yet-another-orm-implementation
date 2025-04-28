import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/PostgresQueryCompiler";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {SQL} from "@/drivers/postgres/dialect/types/SQL";
import {Query} from "@/query-builder/queries/Query";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import {JoinClause} from "@/query-builder/queries/common/JoinClause";
import {OrderByClause} from "@/query-builder/queries/common/OrderByClause";


export class PostgresSelectCompiler extends PostgresQueryCompiler{
    compile(query: Query): CompiledQuery {
        const parts : string[] = [SQL.SELECT];
        const params: any = [];
        if(query.type !== "SELECT"){
            throw new Error(`Invalid query type: ${query.type}`);
        }
        this.addColumns(parts, query.columns);
        this.addFromClause(parts, query.table);
        this.addJoinClause(parts, params, query.join);
        this.addWhereClause(parts, params, query.where);
        this.addOrderByClause(parts, query.orderBy);
        this.addLimitClause(parts, params, query.limit);
        this.addOffsetClause(parts, params, query.offset)



        return {sql : parts.join(" "), params}
    }

    private addColumns(parts: string[], columns : Array<ColumnDescription>) : void{
        parts.push(columns.length > 0
            ? columns.map(col => this.dialectUtils.escapeIdentifier(col)).join(', ')
            : '*');
    }

    private addFromClause(parts: string[], table : string){
        parts.push('FROM', this.dialectUtils.escapeIdentifier(table))
    }

    private addJoinClause(parts : string[], params : any[], joins : JoinClause[] | undefined) : void{
        if(!joins || joins.length === 0){
            return;
        }
        joins.map(join => {
            const joinType = join.type + ' JOIN';
            const tableName = this.dialectUtils.escapeIdentifier(join.table);
            const onCondition = this.conditionCompiler.compile(join.on);
            params.push(...onCondition.params);
            parts.push(`${joinType} ${tableName} ON ${onCondition.sql}`)
        })
    }


    private addOrderByClause(parts : string[], order: OrderByClause | undefined) : void{
        if(!order) return;
        parts.push('ORDER BY')
        parts.push(order.orders.map(clause => {
            (`${this.dialectUtils.escapeIdentifier(clause.column)} ${clause.direction}`)
        }).join(', '))
    }


}