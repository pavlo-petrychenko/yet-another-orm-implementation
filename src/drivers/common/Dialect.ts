import {Query} from "@/query-builder/queries/Query";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

// Strategy
// Adapter
export interface Dialect {
    buildQuery(query: Query): { sql: string; params: any[] };
    // escapeIdentifier(str: ColumnDescription | string): string;
    // parameterize(index: number): string;

}