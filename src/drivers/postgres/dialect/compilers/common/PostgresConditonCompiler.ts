import {PostgresParameterManager} from "@/drivers/postgres/dialect/utils/PostgresParameterManager";
import {PostgresDialectUtils} from "@/drivers/postgres/dialect/utils/PostgresDialectUtils";
import {BaseCondition, ConditionClause, ConditionGroup} from "@/query-builder/queries/common/WhereClause";
import {CompiledQuery} from "@/drivers/postgres/dialect/types/CompiledQuery";

export class PostgresConditionCompiler{
    constructor(
        private paramManager: PostgresParameterManager,
        private dialectUtils: PostgresDialectUtils
    ) {}

    compile(condition: ConditionClause): CompiledQuery {
        if (condition.type === "condition") {
            return this.compileBaseCondition(condition);
        }
        return this.compileConditionGroup(condition as ConditionGroup);
    }


    private compileConditionGroup(condition: ConditionGroup): CompiledQuery {

        const {conditions} = condition;

        const parts: string[] = [];
        const allParams: any[] = [];

        for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];
            const compiled = this.compile(cond);

            const prefix = i === 0 ? "" : ` ${cond.connector ?? "AND"} `;

            parts.push(prefix + compiled.sql);
            allParams.push(...compiled.params);
        }

        return {
            sql: `(${parts.join("")})`,
            params: allParams
        };


    }

    private compileBaseCondition(cond: BaseCondition): CompiledQuery {
        const {operator, right, isColumnComparison} = cond;
        const left = this.dialectUtils.escapeIdentifier(cond.left);

        if (Array.isArray(right)) {
            const placeholders = right.map((_, index) =>
                this.paramManager.getNextParameter()).join(", ");

            return {
                sql: `${left} ${operator} (${placeholders})`,
                params: isColumnComparison ? [] : right
            };
        }

        const placeholder = isColumnComparison ?
            this.dialectUtils.escapeIdentifier(right as string) :
            this.paramManager.getNextParameter();

        return {
            sql: `${left} ${operator} ${placeholder}`,
            params: isColumnComparison ? [] : [right]
        };
    }


}