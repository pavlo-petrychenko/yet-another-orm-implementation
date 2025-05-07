// import { DeleteQueryBuilder } from "@/query-builder/builder/delete/DeleteQueryBuilder";

// import {DeleteQueryBuilder} from "query-builder/builder/delete/DeleteQueryBuilder";

import {DeleteQueryBuilder} from "../DeleteQueryBuilder";

describe("DeleteQueryBuilder", () => {
    it("builds basic delete query with table", () => {
        const query = new DeleteQueryBuilder()
            .from("users")
            .build();

        expect(query).toEqual({
            type: "DELETE",
            table: "users",
            where: undefined,
            groupBy: undefined,
            orderBy: undefined,
            limit: undefined,
            offset: undefined,
            join: [],
        });
    });


    it("allows chaining from() method", () => {
        const builder = new DeleteQueryBuilder();
        const result = builder.from("posts");
        expect(result).toBe(builder);
    });

    it("includes where clause if specified", () => {
        const builder = new DeleteQueryBuilder()
            .from("users")
            .where(w => w.where("is_deleted", "=", "false"));

        const query = builder.build();

        expect(query.type).toBe("DELETE");
        expect(query.table).toBe("users");
        expect(query.where).toBeDefined();
        expect(query.where!.type).toBe("group");
    });

    it("includes join clause if specified", () => {
        const builder = new DeleteQueryBuilder()
            .from("users")
            .innerJoin("profiles", w => w.where("users.id", "=", "profiles.user_id", true));

        const query = builder.build();
        expect(query.join).toBeDefined();
        expect(query.join![0]).toMatchObject({
            type: "INNER",
            table: "profiles"
        });
    });

    it("includes limit if specified", () => {
        const builder = new DeleteQueryBuilder()
            .from("logs")
            .limit(5);

        const query = builder.build();
        expect(query.limit).toEqual({ type: "limit", count: 5 });
    });

    it("builds empty delete query with default values", () => {
        const query = new DeleteQueryBuilder().build();

        expect(query).toEqual({
            type: "DELETE",
            table: "",
            where: undefined,
            groupBy: undefined,
            orderBy: undefined,
            limit: undefined,
            offset: undefined,
            join: [],
        });
    });


    it("builds complex delete query", () => {
        const builder = new DeleteQueryBuilder()
            .from("logs")
            .where(w => w.where("level", "=", "error"))
            .limit(10)
            .offset(20)
            .orderBy("timestamp", "DESC")
            .groupBy("source");

        const query = builder.build();

        expect(query).toMatchObject({
            type: "DELETE",
            table: "logs",
            where: expect.any(Object),
            limit: { type: "limit", count: 10 },
            offset: { type: "offset", count: 20 },
            orderBy: {
                type: "order_by",
                orders: [{ column: { name: "timestamp" }, direction: "DESC" }]
            },
            groupBy: {
                type: "group_by",
                columns: [{ name: "source" }]
            }
        });
    });
});
