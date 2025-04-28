import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/PostgresQueryCompiler";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {SQL} from "@/drivers/postgres/dialect/types/SQL";
import {Query} from "@/query-builder/queries/Query";

export class PostgresUpdateCompiler extends PostgresQueryCompiler{
    compile(query: Query): CompiledQuery {
        const parts: string[] = [SQL.UPDATE];
        const params: any[] = [];

        if(query.type !== "UPDATE"){
            throw new Error(`Invalid query type ${query.type}`);
        }

        this.addTable(parts, query.table);
        this.addSetClause(parts, params, query.values);
        this.addWhereClause(parts, params, query.where);
        this.addReturningClause(parts, query.returning);
        this.addLimitClause(parts, params, query.limit);
        this.addOffsetClause(parts, params, query.offset);

        return { sql: parts.join(' '), params };
    }

    private addSetClause(parts: string[], params : any[], values : Record<string, any> | undefined) : void{
        if(!values){
            return;
        }
        const sets = Object.entries(values).map(([key, _]) => {
                return `${this.dialectUtils.escapeIdentifier(key)} = ${this.paramManager.getNextParameter()}`
            }
        );
        parts.push(`SET ${sets.join(', ')}`)
        params.push(...Object.values(values));
    }


}