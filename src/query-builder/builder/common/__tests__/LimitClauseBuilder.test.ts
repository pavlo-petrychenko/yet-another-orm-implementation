import {LimitBuilder} from "@/query-builder/builder/common/LimitClauseBuilder";

describe("LimitBuilder", () => {
    it("returns null by default", () => {
        const builder = new LimitBuilder();
        expect(builder.build()).toBeNull();
    });

    it("sets and builds a limit clause", () => {
        const builder = new LimitBuilder();
        builder.set(10);
        expect(builder.build()).toEqual({
            type: "limit",
            count: 10
        });
    });

    it("overwrites previous limit", () => {
        const builder = new LimitBuilder();
        builder.set(5).set(20);
        expect(builder.build()).toEqual({
            type: "limit",
            count: 20
        });
    });
});
