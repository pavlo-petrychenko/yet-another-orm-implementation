import {UpdateQueryBuilder} from "@/query-builder/builder/update/UpdateQueryBuilder";

describe("UpdateQueryBuilder", () => {
    it("builds a basic update query", () => {
        const query = new UpdateQueryBuilder()
            .table("users")
            .set({ name: "John" })
            .build();

        expect(query).toEqual({
            type: "UPDATE",
            table: "users",
            values: { name: "John" },
            where: undefined,
            join: [],
            groupBy: undefined,
            orderBy: undefined,
            limit: undefined,
            offset: undefined
        });
    });

    it("builds with empty updates", () => {
        const query = new UpdateQueryBuilder()
            .table("users")
            .set({})
            .build();

        expect(query).toEqual(expect.objectContaining({
            type: "UPDATE",
            table: "users",
            values: {}
        }));
    });

    it("builds with default table and values when not set", () => {
        const query = new UpdateQueryBuilder().build();

        expect(query).toEqual({
            type: "UPDATE",
            table: "",
            values: {},
            where: undefined,
            join: [],
            groupBy: undefined,
            orderBy: undefined,
            limit: undefined,
            offset: undefined
        });
    });

    it("overwrites values if set() is called multiple times", () => {
        const builder = new UpdateQueryBuilder()
            .table("users")
            .set({ name: "Alice" })
            .set({ age: 30 }); // overrides previous

        const query = builder.build();

        expect(query.values).toEqual({ age: 30 });
    });

    it("returns correct table after calling table()", () => {
        const builder = new UpdateQueryBuilder().table("products");
        expect(builder.build().table).toBe("products");
    });
});
