import {OrderByBuilder} from "@/query-builder/builder/common/OrderByClauseBuilder";

describe("OrderByBuilder", () => {
    it("returns null if no orders are added", () => {
        const builder = new OrderByBuilder();
        expect(builder.build()).toBeNull();
    });

    it("adds a single order with default direction", () => {
        const builder = new OrderByBuilder();
        builder.add("createdAt");
        expect(builder.build()).toEqual({
            type: "order_by",
            orders: [
                { column: { name: "createdAt" }, direction: "ASC" }
            ]
        });
    });

    it("adds multiple orders with custom directions", () => {
        const builder = new OrderByBuilder();
        builder.add("createdAt", "DESC").add("name", "ASC");
        expect(builder.build()).toEqual({
            type: "order_by",
            orders: [
                { column: { name: "createdAt" }, direction: "DESC" },
                { column: { name: "name" }, direction: "ASC" }
            ]
        });
    });
});
