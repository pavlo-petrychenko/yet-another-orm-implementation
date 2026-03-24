import {RawExpression} from "@/query-builder/queries/common/RawExpression";

/**
 * Creates a COUNT() aggregate expression.
 * @param column - Column name to count, defaults to "*".
 */
export function count(column: string = "*"): RawExpression {
    return {type: "raw", sql: `COUNT(${column})`, params: []};
}

/**
 * Creates a SUM() aggregate expression.
 * @param column - Column name to sum.
 */
export function sum(column: string): RawExpression {
    return {type: "raw", sql: `SUM(${column})`, params: []};
}

/**
 * Creates an AVG() aggregate expression.
 * @param column - Column name to average.
 */
export function avg(column: string): RawExpression {
    return {type: "raw", sql: `AVG(${column})`, params: []};
}

/**
 * Creates a MAX() aggregate expression.
 * @param column - Column name.
 */
export function max(column: string): RawExpression {
    return {type: "raw", sql: `MAX(${column})`, params: []};
}

/**
 * Creates a MIN() aggregate expression.
 * @param column - Column name.
 */
export function min(column: string): RawExpression {
    return {type: "raw", sql: `MIN(${column})`, params: []};
}
