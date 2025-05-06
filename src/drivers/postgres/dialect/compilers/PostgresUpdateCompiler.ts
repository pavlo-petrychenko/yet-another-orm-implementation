import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {SQL} from "@/drivers/postgres/dialect/types/SQL";
import {Query} from "@/query-builder/queries/Query";
/**
 * Compiler for building PostgreSQL UPDATE queries.
 *
 * Converts a high-level `Query` object of type UPDATE into a SQL string and parameters array.
 * Inherits shared logic from PostgresQueryCompiler.
 */
export class PostgresUpdateCompiler extends PostgresQueryCompiler{
    /**
     * Compiles an UPDATE query into SQL and parameter values.
     *
     * @param query - The UPDATE query object to compile.
     * @returns The compiled SQL and parameter list.
     * @throws Error if the query type is not "UPDATE".
     */
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
    /**
     * Adds a SET clause to the UPDATE query.
     *
     * @param parts - Array collecting SQL fragments.
     * @param params - Array collecting parameter values.
     * @param values - A record of column names and the values to update them with.
     */
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