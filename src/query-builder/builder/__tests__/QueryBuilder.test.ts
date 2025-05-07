// tests/QueryBuilder.test.ts
// import { QueryBuilder } from "@/query-builder/builder/QueryBuilder";
// import { SelectQueryBuilder } from "@/query-builder/builder/select/SelectQueryBuilder";
// import { InsertQueryBuilder } from "@/query-builder/builder/insert/InsertQueryBuilder";
// import { UpdateQueryBuilder } from "@/query-builder/builder/update/UpdateQueryBuilder";
// import { DeleteQueryBuilder } from "@/query-builder/builder/delete/DeleteQueryBuilder";

// import {QueryBuilder} from "query-builder/builder/QueryBuilder";
// import {SelectQueryBuilder} from "query-builder/builder/select/SelectQueryBuilder";
// import {InsertQueryBuilder} from "query-builder/builder/insert/InsertQueryBuilder";
// import {UpdateQueryBuilder} from "query-builder/builder/update/UpdateQueryBuilder";
// import {DeleteQueryBuilder} from "query-builder/builder/delete/DeleteQueryBuilder";

import {QueryBuilder} from "../QueryBuilder";
import {SelectQueryBuilder} from "../select/SelectQueryBuilder";
import {InsertQueryBuilder} from "../insert/InsertQueryBuilder";
import {UpdateQueryBuilder} from "../update/UpdateQueryBuilder";
import {DeleteQueryBuilder} from "../delete/DeleteQueryBuilder";

describe("QueryBuilder", () => {
    it("select() returns instance of SelectQueryBuilder", () => {
        const builder = new QueryBuilder().select();
        expect(builder).toBeInstanceOf(SelectQueryBuilder);
    });

    it("insert() returns instance of InsertQueryBuilder", () => {
        const builder = new QueryBuilder().insert();
        expect(builder).toBeInstanceOf(InsertQueryBuilder);
    });

    it("update() returns instance of UpdateQueryBuilder", () => {
        const builder = new QueryBuilder().update();
        expect(builder).toBeInstanceOf(UpdateQueryBuilder);
    });

    it("delete() returns instance of DeleteQueryBuilder", () => {
        const builder = new QueryBuilder().delete();
        expect(builder).toBeInstanceOf(DeleteQueryBuilder);
    });

    it("findOne() builds SELECT with WHERE and LIMIT 1", () => {
        const query = new QueryBuilder()
            .findOne(w => w.where("id", "=", 123))
            .from("users")
            .build();

        expect(query).toEqual({
            type: "SELECT",
            table: "users",
            columns: [{ name: "*" }],
            join: [],
            groupBy: undefined,
            orderBy: undefined,
            offset: undefined,
            limit: { type: "limit", count: 1 },
            where: {
                type: "group",
                connector: "AND",
                conditions: [
                    {
                        type: "condition",
                        left: { name: "id", alias: undefined },
                        operator: "=",
                        right: 123,
                        isColumnComparison: false,
                        connector: "AND"
                    }
                ]
            }
        });
    });


    it("findOne() builds SELECT with WHERE and LIMIT 1", () => {
        const query = new QueryBuilder()
            .findOne(w => w.where("id", "=", 123))
            .from("users")
            .build();

        expect(query).toEqual({
            type: "SELECT",
            table: "users",
            columns: [{ name: "*" }],
            join: [],
            groupBy: undefined,
            orderBy: undefined,
            offset: undefined,
            limit: { type: "limit", count: 1 },
            where: {
                type: "group",
                connector: "AND",
                conditions: [
                    {
                        type: "condition",
                        left: { name: "id", alias: undefined },
                        operator: "=",
                        right: 123,
                        isColumnComparison: false,
                        connector: "AND"
                    }
                ]
            }
        });
    });

});
