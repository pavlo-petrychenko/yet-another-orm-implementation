import {SelectQueryBuilder} from "@/query-builder/builder/select/SelectQueryBuilder";

describe("SelectQueryBuilder", () => {
    it("builds select query with from and select", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .select("id", "name")
            .build();

        expect(query).toEqual({
            type: "SELECT",
            table: "users",
            columns: [
                { name: "id", alias: undefined, table: "users" },
                { name: "name", alias: undefined, table: "users" },
            ],
            groupBy: undefined,
            join: [],
            limit: undefined,
            offset: undefined,
            orderBy: undefined,
            where: undefined,
        });
    });

    it("adds alias if provided with AS", () => {
        const query = new SelectQueryBuilder()
            .from("posts")
            .select("title AS postTitle", "author_id AS author")
            .build();

        expect(query.columns).toEqual([
            { name: "title", alias: "postTitle", table: "posts" },
            { name: "author_id", alias: "author", table: "posts" },
        ]);
    });

    it("removes * if custom columns are selected", () => {
        const builder = new SelectQueryBuilder()
            .from("logs")
            .select(); // defaults to *

        builder.select("timestamp", "level");

        expect(builder.build().columns).not.toContainEqual({ name: "*" });
        expect(builder.build().columns).toEqual([
            { name: "timestamp", alias: undefined, table: "logs" },
            { name: "level", alias: undefined, table: "logs" },
        ]);
    });

    it("sets * if select() called with no arguments", () => {
        const query = new SelectQueryBuilder()
            .from("settings")
            .select()
            .build();

        expect(query.columns).toEqual([
            { name: "*" }
        ]);
    });

    it("supports multiple select calls and appends columns", () => {
        const builder = new SelectQueryBuilder()
            .select("id")
            .from("messages")
            .select("body AS content");

        expect(builder.build().columns).toEqual([
            { name: "body", alias: "content", table: "messages" }
        ]);
    });


    it("clears * only once even if multiple selects", () => {
        const builder = new SelectQueryBuilder()
            .from("logs")
            .select()
            .select("time");

        const columns = builder.build().columns;
        const star = columns.find(c => c.name === "*");
        expect(star).toBeUndefined();
    });

    it("returns empty table name by default", () => {
        const query = new SelectQueryBuilder().select("id").build();
        expect(query.table).toBe("");
    });

    it("does not throw when select is called before from", () => {
        const builder = new SelectQueryBuilder()
            .select("id AS userId")
            .from("users");

        const query = builder.build();

        expect(query.columns).toEqual([
            { name: "id", alias: "userId", table: "" }
        ]);
    });


    it("handles column with multiple ' AS ' (uses first only)", () => {
        const builder = new SelectQueryBuilder()
            .from("weird")
            .select("something AS x AS y");

        const result = builder.build().columns[0];
        expect(result).toEqual({
            name: "something",
            alias: "x", // split on first ' AS '
            table: "weird"
        });
    });
});
