import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
import {DeleteQuery} from "@/query-builder/queries/Delete";



export class DeleteQueryBuilder extends ClauseMixin {
    private tableName: string = "";

    from(table: string): this {
        this.tableName = table;
        return this;
    }

    build(): DeleteQuery {
        return {
            type: "DELETE",
            table: this.tableName,
            ...this.buildCommonClauses()
        };
    }
}