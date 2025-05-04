/**
 * A collection of common SQL keywords used in query generation.
 *
 * This constant object standardizes and centralizes SQL clause keywords
 * for reuse across query compiler implementations (e.g., SELECT, INSERT, etc.).
 *
 * @example
 * parts.push(SQL.SELECT, '*', SQL.FROM, 'users');
 */
export const SQL = {
    /** SQL SELECT clause */
    SELECT: 'SELECT',
    /** SQL INSERT clause (starts an INSERT INTO statement) */
    INSERT: 'INSERT INTO',
    /** SQL UPDATE clause */
    UPDATE: 'UPDATE',
    /** SQL DELETE clause (starts a DELETE FROM statement) */
    DELETE: 'DELETE FROM',
    /** SQL FROM clause */
    FROM: 'FROM',
    /** SQL WHERE clause */
    WHERE: 'WHERE',
    /** SQL ORDER BY clause */
    ORDER_BY: 'ORDER BY',
    /** SQL LIMIT clause */
    LIMIT: 'LIMIT',
    /** SQL OFFSET clause */
    OFFSET: 'OFFSET',
    /** SQL VALUES clause (used in INSERT statements) */
    VALUES: 'VALUES',
    /** SQL RETURNING clause (used for returning rows after INSERT/UPDATE/DELETE) */
    RETURNING: 'RETURNING',
    /** SQL SET clause (used in UPDATE statements) */
    SET: 'SET'
} as const;
