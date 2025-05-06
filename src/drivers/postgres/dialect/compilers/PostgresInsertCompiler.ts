import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {SQL} from "@/drivers/postgres/dialect/types/SQL";
import {Query} from "@/query-builder/queries/Query";


export class PostgresInsertCompiler extends PostgresQueryCompiler{
    compile(query: Query): CompiledQuery {
        const parts: string[] = [SQL.INSERT];
        const params: any[] = [];

        if(query.type !== "INSERT"){
            throw new Error(`Invalid query type ${query.type}`);
        }

        this.addTable(parts, query.table);
        this.addValues(parts, params, query.values);
        this.addReturningClause(parts, query.returning);
        this.addLimitClause(parts, params, query.limit);
        this.addOffsetClause(parts, params, query.offset);

        return { sql: parts.join(' '), params };

    }

    private addValues(parts : string[], params: any[], values : Record<string, any> | undefined) : void{
        if(!values){
            return;
        }
        parts.push('(')
        parts.push(Object.keys(values).join(', '))
        parts.push(')')

        parts.push('VALUES', '(');
        parts.push(Object.values(values).map(v => this.paramManager.getNextParameter()).join(', '));
        parts.push(')');
        params.push(...Object.values(values));
    }


}