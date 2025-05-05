import {ClauseMixin} from "@/query-builder/builder/common/ClauseMixin";
import {SelectQuery} from "@/query-builder/queries/Select";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";
import {Connection} from "@/connection/Connection";

export class SelectQueryBuilder extends ClauseMixin {
    private tableName: string = "";
    private columns: ColumnDescription[] = [];

    from(table: string): this {
        this.tableName = table;
        return this;
    }

    select(...columns: string[]): this {
        if(columns.length > 0){
            this.columns.splice(this.columns.findIndex(value => value.name === "*"), 1)
            columns.map(c => {
                const [name, alias] = c.trim().split(' AS ')
                this.columns.push({name, alias, table : this.tableName})
            })
        }else{
            this.columns = [{name : "*"}]
        }
        return this;
    }

    build(): SelectQuery {
        return {
            type: "SELECT",
            table: this.tableName,
            columns: this.columns,
            ...this.buildCommonClauses()
        };
    }


}