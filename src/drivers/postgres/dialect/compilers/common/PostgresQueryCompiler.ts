import {PostgresParameterManager} from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {Query} from "@/query-builder/queries/Query";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {PostgresConditionCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresConditonCompiler";
import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";
import {ConditionClause} from "@/query-builder/queries/common/WhereClause";
import {LimitClause} from "@/query-builder/queries/common/LimitClause";
import {OffsetClause} from "@/query-builder/queries/common/OffsetClause";


// Dependency injection
export abstract class PostgresQueryCompiler {
    constructor(
        protected paramManager: PostgresParameterManager,
        protected dialectUtils: PostgresDialectUtils,
        protected conditionCompiler : PostgresConditionCompiler
    ) {}

    abstract compile(query : Query) : CompiledQuery;

    protected addTable(parts: string[], table : string){
        parts.push(this.dialectUtils.escapeIdentifier(table))
    }

    protected addWhereClause(parts: string[], params : any[], condition : ConditionClause | undefined) : void{
        if(!condition){
            return;
        }
        parts.push('WHERE')
        const compiledCondition = this.conditionCompiler.compile(condition)
        parts.push(compiledCondition.sql)
        params.push(...compiledCondition.params)
    }

    protected addReturningClause(parts: string[], returning : ReturningClause | undefined) : void{
        if(!returning){
            return;
        }
        parts.push(`RETURNING ${returning.columns.map(f => this.dialectUtils.escapeIdentifier(f)).join(', ')}`)
    }

    protected addLimitClause(parts : string[], params : any[], limit : LimitClause | undefined) : void{
        if(!limit) return;
        parts.push('LIMIT', this.paramManager.getNextParameter());
        params.push(limit.count);
    }

    protected addOffsetClause(parts : string[], params : any[], offset : OffsetClause | undefined) : void{
        if(!offset) return;
        parts.push('OFFSET', this.paramManager.getNextParameter());
        params.push(offset.count);
    }

}