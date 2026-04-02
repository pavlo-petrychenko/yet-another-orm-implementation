import {ConditionClause} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import {OrderByClause} from "@/query-builder/types/clause/OrderByClause/OrderByClause";
import {LimitClause} from "@/query-builder/types/clause/LimitClause/LimitClause";
import {ReturningClause} from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import { QueryType, QueryCommon } from "@/query-builder/types/query/Query";

export interface UpdateQuery extends QueryCommon {
  type: QueryType.UPDATE;
  values: Record<string, any>;
  where?: ConditionClause;
  orderBy?: OrderByClause;
  limit?: LimitClause;
  returning?: ReturningClause;
}
