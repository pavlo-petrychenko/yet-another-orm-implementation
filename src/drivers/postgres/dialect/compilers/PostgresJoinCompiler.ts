import type { JoinClause } from "@/query-builder";
import { JoinType } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { JoinCompiler } from "@/drivers/common/compilers/JoinCompiler";

export class PostgresJoinCompiler implements JoinCompiler {
  compile(clause: JoinClause, ctx: CompilationContext): string {
    const table = ctx.utils.qualifyTable(clause.table);
    const head = `${clause.joinType} JOIN ${table}`;
    if (clause.joinType === JoinType.CROSS || !clause.on) {
      return head;
    }
    return `${head} ON ${ctx.compileCondition(clause.on)}`;
  }
}
