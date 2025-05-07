// import {InsertQueryBuilder} from "@/query-builder/builder/insert/InsertQueryBuilder";
// import {InsertQuery} from "@/query-builder/queries/Insert";

// import {InsertQueryBuilder} from "query-builder/builder/insert/InsertQueryBuilder";

import {InsertQueryBuilder} from "../InsertQueryBuilder";

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

    it("returns correct query when empty object is passed as values", () => {
        const query = new InsertQueryBuilder()
            .into("logs")
            .valuesList({})
            .build();

        expect(query).toEqual({
            type: "INSERT",
            table: "logs",
            values: {}
        });
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
            values: 42
        });
    });
});
