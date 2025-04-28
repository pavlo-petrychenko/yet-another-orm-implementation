import {GroupByClause} from "@/query-builder/queries/common/GroupByClause";
import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

export class GroupByBuilder {
    private columns: ColumnDescription[] = [];

    add(column: string): this {
        this.columns.push({name : column});
        return this;
    }

    build(): GroupByClause | null {
        return this.columns.length
            ? { type: "group_by", columns: this.columns }
            : null;
    }
}