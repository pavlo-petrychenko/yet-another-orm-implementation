export interface Clause {
  type: ClauseType;
}

export enum ClauseType {
  Condition = "condition",
  GroupBy = "group_by",
  Join = "join",
  Limit = "limit",
  OrderBy = "order_by",
  Offset = "offset",
  Returning = "returning",
}
