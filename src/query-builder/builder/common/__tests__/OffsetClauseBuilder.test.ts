import { OffsetBuilder } from "@/query-builder/builder/common/OffsetClauseBuilder";

describe("OffsetBuilder", () => {
    let builder: OffsetBuilder;

    beforeEach(() => {
        builder = new OffsetBuilder();
    });

    describe("set()", () => {
        it("should set the count and return the builder instance", () => {
            const result = builder.set(5);
            expect(result).toBeInstanceOf(OffsetBuilder);
        });

        it("should allow method chaining", () => {
            const result = builder.set(10).build();
            expect(result).toEqual({ type: "offset", count: 10 });
        });

        it("should overwrite previously set count", () => {
            builder.set(3);
            builder.set(7);
            const result = builder.build();
            expect(result).toEqual({ type: "offset", count: 7 });
        });

        it("should handle zero as a valid offset", () => {
            builder.set(0);
            const result = builder.build();
            expect(result).toEqual({ type: "offset", count: 0 });
        });

        it("should allow negative offsets", () => {
            builder.set(-5);
            const result = builder.build();
            expect(result).toEqual({ type: "offset", count: -5 });
        });

        it("should accept undefined without throwing (but produce null build)", () => {
            // @ts-expect-error - testing runtime behavior, not type safety
            builder.set(undefined);
            const result = builder.build();
            expect(result).toEqual({ type: "offset", count: undefined });
        });

        it("should accept NaN and build with it", () => {
            builder.set(NaN);
            const result = builder.build();
            expect(result).toEqual({ type: "offset", count: NaN });
        });
    });

    describe("build()", () => {
        it("should return null if no offset is set", () => {
            const result = builder.build();
            expect(result).toBeNull();
        });

        it("should return an OffsetClause when count is set", () => {
            builder.set(15);
            const result = builder.build();
            expect(result).toEqual({ type: "offset", count: 15 });
        });
    });
});
