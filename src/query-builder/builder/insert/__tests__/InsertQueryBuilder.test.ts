import {InsertQueryBuilder} from "@/query-builder/builder/insert/InsertQueryBuilder";

describe("InsertQueryBuilder", () => {
    it("builds basic insert query", () => {
        const query = new InsertQueryBuilder()
            .into("users")
            .valuesList({ name: "John", age: 30 })
            .build();

        expect(query).toEqual({
            type: "INSERT",
            table: "users",
            values: { name: "John", age: 30 }
        });
    });

    it("throws when empty object is passed as values", () => {
        expect(() =>
            new InsertQueryBuilder()
                .into("logs")
                .valuesList({})
        ).toThrow("Values must be a non-empty object");
    });

    it("returns correct query if into() is not called", () => {
        const query = new InsertQueryBuilder()
            .valuesList({ x: 1 })
            .build();

        expect(query).toEqual({
            type: "INSERT",
            table: "",
            values: { x: 1 }
        });
    });

    it("returns correct query if valuesList() is not called", () => {
        const builder = new InsertQueryBuilder().into("test");

        builder["values"] = {}; // simulate undefined -> empty object fallback
        const query = builder.build();

        expect(query).toEqual({
            type: "INSERT",
            table: "test",
            values: {}
        });
    });

    it("overwrites values if valuesList is called twice", () => {
        const query = new InsertQueryBuilder()
            .into("overwrite_test")
            .valuesList({ first: 1 })
            .valuesList({ second: 2 })
            .build();

        expect(query).toEqual({
            type: "INSERT",
            table: "overwrite_test",
            values: { second: 2 }
        });
    });

    it("handles null or invalid values input gracefully", () => {
        const builder = new InsertQueryBuilder().into("null_table");

        // @ts-expect-error simulate runtime mistake
        builder["values"] = null;

        const query = builder.build();

        expect(query).toEqual({
            type: "INSERT",
            table: "null_table",
            values: null
        });
    });

    it("handles non-object values input", () => {
        const builder = new InsertQueryBuilder().into("invalid");

        // @ts-expect-error simulate incorrect runtime input
        builder["values"] = 42;

        const query = builder.build();

        expect(query).toEqual({
            type: "INSERT",
            table: "invalid",
            values: 42,
            returning: undefined,
        });
    });

    it("supports returning clause", () => {
        const query = new InsertQueryBuilder()
            .into("users")
            .valuesList({ name: "John" })
            .returning("id", "name")
            .build();

        expect(query.returning).toEqual({
            type: "returning",
            columns: [
                { name: "id", alias: undefined },
                { name: "name", alias: undefined },
            ]
        });
    });

    it("supports returning with alias", () => {
        const query = new InsertQueryBuilder()
            .into("users")
            .valuesList({ name: "John" })
            .returning("id as userId")
            .build();

        expect(query.returning).toEqual({
            type: "returning",
            columns: [
                { name: "id", alias: "userId" },
            ]
        });
    });

    it("supports batch insert with array of objects", () => {
        const query = new InsertQueryBuilder()
            .into("users")
            .valuesList([
                { name: "John", age: 30 },
                { name: "Jane", age: 25 },
            ])
            .build();

        expect(query.values).toEqual([
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
        ]);
    });

    it("throws on empty array for batch insert", () => {
        expect(() =>
            new InsertQueryBuilder().into("users").valuesList([])
        ).toThrow("Values array must not be empty");
    });

    it("throws on invalid object in batch array", () => {
        expect(() =>
            new InsertQueryBuilder().into("users").valuesList([{ name: "ok" }, {}])
        ).toThrow("Values at index 1 must be a non-empty object");
    });

    it("returning is undefined when not called", () => {
        const query = new InsertQueryBuilder()
            .into("users")
            .valuesList({ name: "John" })
            .build();

        expect(query.returning).toBeUndefined();
    });
});
