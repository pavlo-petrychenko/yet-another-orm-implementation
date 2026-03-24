import {Dialect} from "@/drivers/common/Dialect";
import {Query} from "@/query-builder/queries/Query";
import {SelectQuery} from "@/query-builder/queries/Select";
import {InsertQuery} from "@/query-builder/queries/Insert";
import {UpdateQuery} from "@/query-builder/queries/Update";
import {DeleteQuery} from "@/query-builder/queries/Delete";
import {ConditionClause} from "@/query-builder/queries/common/WhereClause";

export class SqliteDialect implements Dialect {
    private paramCount = 0;

    buildQuery(query: Query): { sql: string; params: any[] } {
        this.paramCount = 0;
        const params: any[] = [];

        switch (query.type) {
            case 'SELECT':
                return this.buildSelect(query, params);
            case 'INSERT':
                return this.buildInsert(query, params);
            case 'UPDATE':
                return this.buildUpdate(query, params);
            case 'DELETE':
                return this.buildDelete(query, params);
            default:
                throw new Error('Unknown query type');
        }
    }

    escapeIdentifier(str: string): string {
        return `"${str.replace(/"/g, '""')}"`;
    }

    parameterize(_index: number): string {
        return '?';
    }

    private buildSelect(_query: SelectQuery, params: any[]): { sql: string; params: any[] } {
        return {sql : '', params}

    }

    private buildInsert(_query: InsertQuery, params: any[]): { sql: string; params: any[] } {
        return {sql : '', params}

    }

    private buildUpdate(_query: UpdateQuery, params: any[]): { sql: string; params: any[] } {
        return {sql : '', params}
    }

    private buildDelete(_query: DeleteQuery, params: any[]): { sql: string; params: any[] } {
        return {sql : '', params}
    }

    private buildWhere(_where: ConditionClause, _params: any[]): string {
        return ''
    }
}
