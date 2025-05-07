// import { PostgresDialect } from "@/drivers/postgres/dialect/PostgresDialect";
// import { Query } from "@/query-builder/queries/Query";
// import { CompiledQuery } from "@/drivers/postgres/dialect/types/CompiledQuery";

// import {PostgresDialect} from "drivers/postgres/dialect/PostgresDialect";
// import {Query} from "query-builder/queries/Query";

import {PostgresDialect} from "../PostgresDialect";
import {Query} from "../../../../query-builder/queries/Query";

describe("PostgresDialect", () => {
    let dialect: PostgresDialect;

    beforeEach(() => {
        dialect = new PostgresDialect();
    });

    it("throws error on unknown query type", () => {
        const badQuery = { type: "UNKNOWN" } as unknown as Query; // Type assertion to 'Query'
        expect(() => dialect.buildQuery(badQuery)).toThrow("Unknown query type: UNKNOWN");
    });


    it.each(["SELECT", "INSERT", "UPDATE", "DELETE"] as const)(
        "buildQuery() routes %s to proper compiler",
        (type) => {
            const dummyQuery = { type } as Query;

            // Patch the compiler with a mock
            const compileMock = jest.fn().mockReturnValue({ sql: "", params: [] });
            // @ts-ignore
            dialect.queryCompilers.set(type, { compile: compileMock });

            const compiled = dialect.buildQuery(dummyQuery);

            expect(compileMock).toHaveBeenCalledWith(dummyQuery);
            expect(compiled).toEqual({ sql: "", params: [] });
        }
    );

    it("resets parameter manager before compiling", () => {
        const dummyQuery = { type: "SELECT" } as Query;

        const spy = jest.spyOn<any, any>(dialect["paramManager"], "reset");
        const compileMock = jest.fn().mockReturnValue({ sql: "", params: [] });

        // @ts-ignore
        dialect.queryCompilers.set("SELECT", { compile: compileMock });

        dialect.buildQuery(dummyQuery);

        expect(spy).toHaveBeenCalled();
    });

    it("initializes query compilers for all query types", () => {
        // Перевіряємо, чи всі компілятори зареєстровані
        const compilers = ["SELECT", "INSERT", "UPDATE", "DELETE"];
        compilers.forEach(type => {
            expect(dialect["queryCompilers"].has(type)).toBe(true);
        });
    });
});
