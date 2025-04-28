import {ConditionClause} from "@/query-builder/queries/common/WhereClause";

export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";

export interface JoinClause {
    type : JoinType,
    table: string,
    on: ConditionClause,
}