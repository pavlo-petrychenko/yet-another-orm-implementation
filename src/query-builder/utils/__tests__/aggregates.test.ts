import {count, sum, avg, max, min} from "@/query-builder/utils/aggregates";

describe("Aggregate helpers", () => {
    it("count() defaults to *", () => {
        expect(count()).toEqual({type: "raw", sql: "COUNT(*)", params: []});
    });

    it("count() accepts column", () => {
        expect(count("id")).toEqual({type: "raw", sql: "COUNT(id)", params: []});
    });

    it("sum() wraps column", () => {
        expect(sum("price")).toEqual({type: "raw", sql: "SUM(price)", params: []});
    });

    it("avg() wraps column", () => {
        expect(avg("salary")).toEqual({type: "raw", sql: "AVG(salary)", params: []});
    });

    it("max() wraps column", () => {
        expect(max("age")).toEqual({type: "raw", sql: "MAX(age)", params: []});
    });

    it("min() wraps column", () => {
        expect(min("date")).toEqual({type: "raw", sql: "MIN(date)", params: []});
    });
});
