import {LimitClause} from "@/query-builder/queries/common/LimitClause";


export class LimitBuilder {
    private count: number | null = null;

    set(count: number): this {
        this.count = count;
        return this;
    }

    build(): LimitClause | null {
        return this.count !== null
            ? { type: "limit", count: this.count }
            : null;
    }
}