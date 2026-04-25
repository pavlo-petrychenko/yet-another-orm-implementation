import {type ConditionClause} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import {type OrderByClause} from "@/query-builder/types/clause/OrderByClause/OrderByClause";
import {type LimitClause} from "@/query-builder/types/clause/LimitClause/LimitClause";
import {type ReturningClause} from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import { type QueryType, type QueryCommon } from "@/query-builder/types/query/Query";

export interface DeleteQuery extends QueryCommon {
  type: QueryType.DELETE;
  where?: ConditionClause;
  orderBy?: OrderByClause;
  limit?: LimitClause;
  returning?: ReturningClause;
}
