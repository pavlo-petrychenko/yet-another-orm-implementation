import type { OrderByClause } from "@/query-builder";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { OrderByCompiler } from "@/drivers/common/compilers/OrderByCompiler";

export class PostgresOrderByCompiler implements OrderByCompiler {
  compile(clause: OrderByClause, ctx: CompilationContext): string {
    const parts = clause.orders.map(
      ({ column, direction }) => `${ctx.utils.qualifyColumn(column)} ${direction}`,
    );
    return `ORDER BY ${parts.join(", ")}`;
  }
}
