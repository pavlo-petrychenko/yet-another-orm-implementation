import {ColumnDescription} from "@/query-builder/types/common/Column";
import {RawExpression} from "@/query-builder/types/common/RawExpression";
import {ConditionClause} from "@/query-builder/types/clause/ConditionClause/ConditionClause";
import {GroupByClause} from "@/query-builder/types/clause/GroupByClause/GroupByClause";
import {OrderByClause} from "@/query-builder/types/clause/OrderByClause/OrderByClause";
import {LimitClause} from "@/query-builder/types/clause/LimitClause/LimitClause";
import {OffsetClause} from "@/query-builder/types/clause/OffsetClause/OffsetClause";
import {ReturningClause} from "@/query-builder/types/clause/ReturningClause/ReturningClause";
import {JoinClause} from "@/query-builder/types/clause/JoinClause/JoinClause";
import { QueryType, QueryCommon } from "@/query-builder/types/query/Query";

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
