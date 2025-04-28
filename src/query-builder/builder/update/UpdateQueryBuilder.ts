import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
import {UpdateQuery} from "@/query-builder/queries/Update";


export class UpdateQueryBuilder extends ClauseMixin {
    private tableName: string = "";
    private updates: Record<string, any> = {};

    table(table: string): this {
        this.tableName = table;
        return this;
    }

    set(updates: Record<string, any>): this {
        this.updates = updates;
        return this;
    }

    build(): UpdateQuery {
        return {
            type: "UPDATE",
            table: this.tableName,
            values: this.updates,
            ...this.buildCommonClauses()
        };
    }
}
