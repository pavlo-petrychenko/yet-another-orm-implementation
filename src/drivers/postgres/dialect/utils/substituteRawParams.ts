import type { ParameterManager } from "@/drivers/common/ParameterManager";

// Project convention: raw SQL fragments use `?` placeholders, remapped to the dialect's
// placeholder format (e.g. $1, $2 for Postgres) in order.
export function substituteRawParams(sql: string, params: readonly unknown[], paramMgr: ParameterManager): string {
  let i = 0;
  const result = sql.replace(/\?/g, () => {
    if (i >= params.length) {
      throw new Error("Raw SQL: more `?` placeholders than supplied params");
    }
    return paramMgr.add(params[i++]);
  });
  if (i < params.length) {
    throw new Error("Raw SQL: fewer `?` placeholders than supplied params");
  }
  return result;
}
