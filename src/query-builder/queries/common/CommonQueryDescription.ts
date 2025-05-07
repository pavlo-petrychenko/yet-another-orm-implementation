// import {ConditionClause} from "@/query-builder/queries/common/WhereClause";
// import {GroupByClause} from "@/query-builder/queries/common/GroupByClause";
// import {OrderByClause} from "@/query-builder/queries/common/OrderByClause";
// import {LimitClause} from "@/query-builder/queries/common/LimitClause";
// import {OffsetClause} from "@/query-builder/queries/common/OffsetClause";
// import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";
// import {JoinClause} from "@/query-builder/queries/common/JoinClause";

// import {ConditionClause} from "query-builder/queries/common/WhereClause";
// import {GroupByClause} from "query-builder/queries/common/GroupByClause";
// import {OrderByClause} from "query-builder/queries/common/OrderByClause";
// import {LimitClause} from "query-builder/queries/common/LimitClause";
// import {OffsetClause} from "query-builder/queries/common/OffsetClause";
// import {ReturningClause} from "query-builder/queries/common/ReturningClause";
// import {JoinClause} from "query-builder/queries/common/JoinClause";

import {ConditionClause} from "./WhereClause";
import {GroupByClause} from "./GroupByClause";
import {OrderByClause} from "./OrderByClause";
import {LimitClause} from "./LimitClause";
import {OffsetClause} from "./OffsetClause";
import {ReturningClause} from "./ReturningClause";
import {JoinClause} from "./JoinClause";

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