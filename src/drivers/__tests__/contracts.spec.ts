import type { Query, QueryCommon } from "@/query-builder";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import type { DialectUtils } from "@/drivers/common/DialectUtils";
import type { ParameterManager } from "@/drivers/common/ParameterManager";
import type { CompilationContext } from "@/drivers/common/CompilationContext";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { DBType } from "@/drivers/types/DBType";
import { DriverFactory } from "@/drivers/DriverFactory";
import { NotImplementedError } from "@/drivers/errors/NotImplementedError";
import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn(),
  })),
  Client: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  })),
}));

describe("Driver module contracts", () => {
  describe("DriverFactory", () => {
    it("returns a PostgresDriver for DBType.POSTGRES", () => {
      const factory = new DriverFactory();
      const driver = factory.create({
        type: DBType.POSTGRES,
        host: "localhost",
        port: 5432,
        user: "u",
        password: "p",
        database: "d",
      });
      expect(driver).toBeInstanceOf(PostgresDriver);
    });

    it("throws NotImplementedError for MySQL and SQLite", () => {
      const factory = new DriverFactory();

      expect(() =>
        factory.create({
          type: DBType.MYSQL,
          host: "localhost",
          port: 3306,
          user: "u",
          password: "p",
          database: "d",
        }),
      ).toThrow(NotImplementedError);

      expect(() =>
        factory.create({type: DBType.SQLITE, filename: ":memory:"}),
      ).toThrow(NotImplementedError);
    });
  });

  describe("interface shapes", () => {
    it("Driver / Dialect / ParameterManager / DialectUtils / CompilationContext are satisfiable from outside", () => {
      const params: ParameterManager = {
        add: () => "?",
        getParams: () => [],
      };

      const utils: DialectUtils = {
        escapeIdentifier: (name) => `"${name}"`,
        qualifyTable: (table) => table.name,
        qualifyColumn: (column) => column.name,
      };

      const ctx: CompilationContext = {
        params,
        utils,
        compileCondition: () => "1 = 1",
        compileSelect: () => "SELECT 1",
      };

      const dialect: Dialect = {
        buildQuery: (_query: Query) => ({sql: "", params: []}),
        getUtils: () => utils,
        createParameterManager: () => params,
      };

      const driver: Driver = {
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        isConnected: () => false,
        getDialect: () => dialect,
        query: <TRow = Record<string, unknown>>(
          _q: Query,
        ): Promise<QueryResult<TRow>> =>
          Promise.resolve({rows: [], rowCount: 0}),
      };

      expect(driver.isConnected()).toBe(false);
      expect(driver.getDialect()).toBe(dialect);
      expect(ctx.params.add("x")).toBe("?");
      expect(ctx.utils.escapeIdentifier("col")).toBe('"col"');

      const passed: QueryCommon = {} as QueryCommon;
      expect(passed).toBeDefined();
    });
  });
});
