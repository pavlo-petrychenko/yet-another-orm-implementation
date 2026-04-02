import {ConditionClause} from "@/query-builder/queries/common/clauses/WhereClause";
import {GroupByClause} from "@/query-builder/queries/common/clauses/GroupByClause";
import {OrderByClause} from "@/query-builder/queries/common/clauses/OrderByClause";
import {LimitClause} from "@/query-builder/queries/common/clauses/LimitClause";
import {OffsetClause} from "@/query-builder/queries/common/clauses/OffsetClause";
import {ReturningClause} from "@/query-builder/queries/common/clauses/ReturningClause";
import {JoinClause} from "@/query-builder/queries/common/clauses/JoinClause";

/**
 * Describes the structure of a SQL query with optional clauses.
 */
export interface QueryDescription {

    /**
     * Represents the WHERE clause of the query.
     */
    where?: ConditionClause;
    /**
     * Represents the GROUP BY clause of the query.
     */
    groupBy?: GroupByClause;
    /**
     * Represents the HAVING clause of the query (filters grouped results).
     */
    having?: ConditionClause;
    /**
     * Represents the ORDER BY clause of the query.
     */
    orderBy?: OrderByClause;
    /**
     * Represents the LIMIT clause to restrict the number of rows returned.
     */
    limit?: LimitClause;
    /**
     * Represents the OFFSET clause to skip a number of rows.
     */
    offset?: OffsetClause;
    /**
     * Represents the RETURNING clause (used primarily in PostgreSQL).
     */
    returning?: ReturningClause;
    /**
     * Represents JOIN clauses to combine rows from multiple tables.
     */
    join?: JoinClause[];
}
