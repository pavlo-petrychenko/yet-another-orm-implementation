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
            { name: "id", alias: undefined, table: "" },
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


    it("parses table alias from from()", () => {
        const query = new SelectQueryBuilder()
            .from("users AS u")
            .select("id")
            .build();

        expect(query.table).toBe("users");
        expect(query.tableAlias).toBe("u");
    });

    it("parses lowercase table alias", () => {
        const query = new SelectQueryBuilder()
            .from("orders as o")
            .select("id")
            .build();

        expect(query.table).toBe("orders");
        expect(query.tableAlias).toBe("o");
    });

    it("supports selectRaw with string", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .selectRaw("COUNT(*) AS total")
            .build();

        expect(query.rawColumns).toEqual([
            { type: "raw", sql: "COUNT(*) AS total", params: [] }
        ]);
    });

    it("supports selectRaw with RawExpression", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .selectRaw({ type: "raw", sql: "NOW()", params: [] })
            .build();

        expect(query.rawColumns).toEqual([
            { type: "raw", sql: "NOW()", params: [] }
        ]);
    });

    it("supports union()", () => {
        const otherQuery = new SelectQueryBuilder()
            .from("admins")
            .select("name")
            .build();

        const query = new SelectQueryBuilder()
            .from("users")
            .select("name")
            .union(otherQuery)
            .build();

        expect(query.unions).toHaveLength(1);
        expect(query.unions![0].all).toBe(false);
        expect(query.unions![0].query.table).toBe("admins");
    });

    it("supports unionAll()", () => {
        const otherQuery = new SelectQueryBuilder()
            .from("logs")
            .select("message")
            .build();

        const query = new SelectQueryBuilder()
            .from("events")
            .select("message")
            .unionAll(otherQuery)
            .build();

        expect(query.unions).toHaveLength(1);
        expect(query.unions![0].all).toBe(true);
    });

    it("unions is undefined when none added", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .select("id")
            .build();

        expect(query.unions).toBeUndefined();
    });

    it("rawColumns is undefined when none added", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .select("id")
            .build();

        expect(query.rawColumns).toBeUndefined();
    });

    it("tableAlias is undefined when no alias given", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .select("id")
            .build();

        expect(query.tableAlias).toBeUndefined();
    });

    it("supports distinct()", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .select("email")
            .distinct()
            .build();

        expect(query.distinct).toBe(true);
    });

    it("distinct defaults to undefined", () => {
        const query = new SelectQueryBuilder()
            .from("users")
            .select("id")
            .build();

        expect(query.distinct).toBeUndefined();
    });

    it("handles lowercase 'as' alias syntax", () => {
        const query = new SelectQueryBuilder()
            .from("posts")
            .select("title as postTitle")
            .build();

        expect(query.columns).toEqual([
            { name: "title", alias: "postTitle", table: "posts" },
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
