import {SelectQuery} from "@/query-builder/queries/Select";
import {InsertQuery} from "@/query-builder/queries/Insert";
import {UpdateQuery} from "@/query-builder/queries/Update";
import {DeleteQuery} from "@/query-builder/queries/Delete";
import {QueryDescription} from "@/query-builder/queries/common/CommonQueryDescription";

/**
 * Base interface for all SQL query types.
 *
 * Contains common properties that are shared across
 * SELECT, INSERT, UPDATE, and DELETE operations.
 */
export interface QueryCommon extends QueryDescription {
    /**
     * Type of the SQL query.
     * Determines which specific query interface is used.
     */
    type: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
    /**
     * Name of the database table the query targets.
     */
    table: string;
}

/**
 * Union type that represents any supported SQL query.
 *
 * Each specific query type extends `QueryCommon` and adds its own structure.
 */
export type Query = SelectQuery | InsertQuery | UpdateQuery | DeleteQuery;
