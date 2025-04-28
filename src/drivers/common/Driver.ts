import { Dialect } from './Dialect';
import {Query} from "@/query-builder/queries/Query";

export interface Driver {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(query: Query): Promise<any>;
    isConnected(): boolean;
    getDialect(): Dialect;
}
