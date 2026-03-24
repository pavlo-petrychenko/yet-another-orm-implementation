/**
 * Represents a raw SQL expression that bypasses identifier escaping.
 */
export interface RawExpression {
    type: "raw";
    sql: string;
    params: any[];
}

/**
 * Creates a raw SQL expression.
 *
 * @param sql - The raw SQL string.
 * @param params - Optional parameter values for the expression.
 */
export function raw(sql: string, params?: any[]): RawExpression {
    return {type: "raw", sql, params: params ?? []};
}
