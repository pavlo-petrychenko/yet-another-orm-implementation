import {RawExpression} from "@/query-builder/types/common/RawExpression";

export function raw(sql: string, params?: any[]): RawExpression {
  return {type: "raw", sql, params: params ?? []};
}
