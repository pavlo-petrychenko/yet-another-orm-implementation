import {InsertQuery} from "@/query-builder/queries/Insert";


export class InsertQueryBuilder {
    private tableName: string = "";
    private values: Record<string, any>;

    into(table: string): this {
        this.tableName = table;
        return this;
    }

    valuesList(values: Record<string, any>): this {
        this.values = values;
        return this;
    }

    build(): InsertQuery {
        return {
            type: "INSERT",
            table: this.tableName,
            values: this.values
        };
    }
}