import {ColumnDescription} from "@/query-builder/queries/common/ColumnDecription";

export class PostgresDialectUtils {
    escapeIdentifier(str : ColumnDescription | string) : string{
        if(typeof str === "string"){
            return `"${str.replace(/"/g, '""')}"`
        }

        return this.escapeColumnDescription(str)
    }

    private escapeColumnDescription(col: ColumnDescription): string {
        if (col.name.includes('.')) {
            return this.escapeQualifiedColumn(col);
        }
        return this.escapeSimpleColumn(col);
    }

    private escapeQualifiedColumn(col: ColumnDescription): string {
        const [table, name] = col.name.split('.')
        return col.alias ? `${this.escapeIdentifier(table)}.${this.escapeIdentifier(name)} AS ${this.escapeIdentifier(col.alias)}` : `${this.escapeIdentifier(table)}.${this.escapeIdentifier(name)}`;
    }

    private escapeSimpleColumn(col: ColumnDescription): string {
        if(col.table){
            const qualifiedColumn = `${this.escapeIdentifier(col.table)}.${this.escapeIdentifier(col.name)}`;
            return col.alias ? `${qualifiedColumn} AS ${this.escapeIdentifier(col.alias)}` : qualifiedColumn;
        }else{
            return col.alias ? `${this.escapeIdentifier(col.name)} AS ${this.escapeIdentifier(col.alias)}` : `${this.escapeIdentifier(col.name)}`

        }
    }
}