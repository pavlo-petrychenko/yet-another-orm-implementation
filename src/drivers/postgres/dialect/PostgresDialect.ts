import {Dialect} from "@/drivers/common/Dialect";
import {PostgresParameterManager} from "./utils/PostgresParameterManager";
import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {PostgresQueryCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresQueryCompiler";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";
import {Query} from "@/query-builder/queries/Query";
import {PostgresSelectCompiler} from "@/drivers/postgres/dialect/compilers/PostgresSelectCompiler";
import {PostgresInsertCompiler} from "@/drivers/postgres/dialect/compilers/PostgresInsertCompiler";
import {PostgresUpdateCompiler} from "@/drivers/postgres/dialect/compilers/PostgresUpdateCompiler";
import {PostgresDeleteCompiler} from "@/drivers/postgres/dialect/compilers/PostgresDeleteCompiler";
import {PostgresConditionCompiler} from "@/drivers/postgres/dialect/compilers/common/PostgresConditonCompiler";

export class PostgresDialect implements Dialect {
    private paramManager = new PostgresParameterManager();
    private dialectUtils = new PostgresDialectUtils();
    private queryCompilers: Map<string, PostgresQueryCompiler>;
    private conditionCompiler = new PostgresConditionCompiler(this.paramManager, this.dialectUtils)

    constructor() {
        this.initializeQueryCompilers();
    }

    buildQuery(query: Query): CompiledQuery {
        this.paramManager.reset();

        const compiler = this.queryCompilers.get(query.type)
        if(!compiler){
            throw new Error(`Unknown query type: ${query.type}`);
        }

        return compiler.compile(query)
    }

    private initializeQueryCompilers(): void {
        this.queryCompilers = new Map<string, PostgresQueryCompiler>([
            ['SELECT', new PostgresSelectCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)],
            ['INSERT', new PostgresInsertCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)],
            ['UPDATE', new PostgresUpdateCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)],
            ['DELETE', new PostgresDeleteCompiler(this.paramManager, this.dialectUtils, this.conditionCompiler)]
        ]);

    }


}