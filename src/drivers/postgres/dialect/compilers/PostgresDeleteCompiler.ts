import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {SQL} from "@/drivers/postgres/dialect/types/SQL";
import {Query} from "@/query-builder/queries/Query";



export class PostgresDeleteCompiler extends PostgresQueryCompiler{
    compile(query: Query): CompiledQuery {
        const parts: string[] = [SQL.DELETE];
        const params: any[] = [];

        if(query.type !== "DELETE"){
            throw new Error(`Invalid query type ${query.type}`);
        }

        this.addTable(parts, query.table);
        this.addWhereClause(parts, params, query.where);
        this.addReturningClause(parts, query.returning);
        this.addLimitClause(parts, params, query.limit);
        this.addOffsetClause(parts, params, query.offset);

        return { sql: parts.join(' '), params };
    }

}