import {OffsetClause} from "@/query-builder/queries/common/OffsetClause";

export class OffsetBuilder {
    private count: number | null = null;

    set(count: number): this {
        this.count = count;
        return this;
    }

    build(): OffsetClause | null {
        return this.count !== null
            ? { type: "offset", count: this.count }
            : null;
    }
}