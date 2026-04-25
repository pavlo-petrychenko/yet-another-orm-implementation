import {type ColumnDescription} from "@/query-builder/types/common/ColumnDescription";
import {type RawExpression} from "@/query-builder/types/common/RawExpression";
import {type ConditionClause} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import {type GroupByClause} from "@/query-builder/types/clause/GroupByClause/GroupByClause";
import {type OrderByClause} from "@/query-builder/types/clause/OrderByClause/OrderByClause";
import {type LimitClause} from "@/query-builder/types/clause/LimitClause/LimitClause";
import {type OffsetClause} from "@/query-builder/types/clause/OffsetClause/OffsetClause";
import {type ReturningClause} from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import {type JoinClause} from "@/query-builder/types/clause/JoinClause/JoinClause";
import { type QueryType, type QueryCommon } from "@/query-builder/types/query/Query";

export interface SelectQuery extends QueryCommon {
  type: QueryType.SELECT;
  columns: ColumnDescription[];
  distinct?: boolean;
  tableAlias?: string;
  rawColumns?: RawExpression[];
  unions?: {query: SelectQuery; all: boolean}[];
  where?: ConditionClause;
  groupBy?: GroupByClause;
  having?: ConditionClause;
  orderBy?: OrderByClause;
  limit?: LimitClause;
  offset?: OffsetClause;
  returning?: ReturningClause;
  join?: JoinClause[];
}
