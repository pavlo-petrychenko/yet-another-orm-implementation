export interface RawExpression {
  type: "raw";
  sql: string;
  params: any[];
}
