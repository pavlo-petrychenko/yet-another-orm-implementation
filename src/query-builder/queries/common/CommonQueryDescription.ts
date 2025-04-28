import {ConditionClause} from "@/query-builder/queries/common/WhereClause";
import {GroupByClause} from "@/query-builder/queries/common/GroupByClause";
import {OrderByClause} from "@/query-builder/queries/common/OrderByClause";
import {LimitClause} from "@/query-builder/queries/common/LimitClause";
import {OffsetClause} from "@/query-builder/queries/common/OffsetClause";
import {ReturningClause} from "@/query-builder/queries/common/ReturningClause";
import {JoinClause} from "@/query-builder/queries/common/JoinClause";

export interface QueryDescription {
    where?: ConditionClause;
    groupBy?: GroupByClause;
    orderBy?: OrderByClause;
    limit?: LimitClause;
    offset?: OffsetClause;
    returning?: ReturningClause;
    join?: JoinClause[];
}