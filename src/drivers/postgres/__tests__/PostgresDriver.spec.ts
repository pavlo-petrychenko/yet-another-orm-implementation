import type { SelectQuery } from "@/query-builder";
import { QueryType } from "@/query-builder";
import { DBType } from "@/drivers/types/DBType";
import { PostgresDriver } from "@/drivers/postgres/PostgresDriver";
import { PostgresDialect } from "@/drivers/postgres/dialect/PostgresDialect";
import { Pool, Client } from "pg";

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn().mockResolvedValue(undefined),
  })),
  Client: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

const poolMock = Pool as unknown as jest.Mock;
const clientMock = Client as unknown as jest.Mock;

const baseConfig = {
  type: DBType.POSTGRES as const,
  host: "localhost",
  port: 5432,
  user: "u",
  password: "p",
  database: "d",
};

const lastResult = (mock: jest.Mock): { query: jest.Mock; end: jest.Mock; connect?: jest.Mock } => {
  const results = mock.mock.results;
  return results[results.length - 1].value;
};

beforeEach(() => {
  poolMock.mockClear();
  clientMock.mockClear();
});

describe("PostgresDriver", () => {
  describe("connection-strategy dispatch", () => {
    it("constructs a Pool by default", () => {
      new PostgresDriver(baseConfig);
      expect(poolMock).toHaveBeenCalledTimes(1);
      expect(clientMock).not.toHaveBeenCalled();
    });

    it("constructs a Pool when mode is 'pool'", () => {
      new PostgresDriver({ ...baseConfig, mode: "pool" });
      expect(poolMock).toHaveBeenCalledTimes(1);
      expect(clientMock).not.toHaveBeenCalled();
    });

    it("constructs a Client when mode is 'client'", () => {
      new PostgresDriver({ ...baseConfig, mode: "client" });
      expect(clientMock).toHaveBeenCalledTimes(1);
      expect(poolMock).not.toHaveBeenCalled();
    });

    it("forwards pool.max from config", () => {
      new PostgresDriver({ ...baseConfig, pool: { max: 7 } });
      expect(poolMock).toHaveBeenCalledWith(expect.objectContaining({ host: "localhost", max: 7 }));
    });
  });

  describe("lifecycle", () => {
    it("pool connect issues SELECT 1 and flips isConnected", async () => {
      const driver = new PostgresDriver(baseConfig);
      const pool = lastResult(poolMock);
      expect(driver.isConnected()).toBe(false);
      await driver.connect();
      expect(pool.query).toHaveBeenCalledWith("SELECT 1");
      expect(driver.isConnected()).toBe(true);
    });

    it("pool disconnect calls pool.end and flips isConnected back", async () => {
      const driver = new PostgresDriver(baseConfig);
      const pool = lastResult(poolMock);
      await driver.connect();
      await driver.disconnect();
      expect(pool.end).toHaveBeenCalledTimes(1);
      expect(driver.isConnected()).toBe(false);
    });

    it("client connect calls client.connect", async () => {
      const driver = new PostgresDriver({ ...baseConfig, mode: "client" });
      const client = lastResult(clientMock);
      await driver.connect();
      expect(client.connect).toHaveBeenCalledTimes(1);
      expect(driver.isConnected()).toBe(true);
    });

    it("client disconnect calls client.end", async () => {
      const driver = new PostgresDriver({ ...baseConfig, mode: "client" });
      const client = lastResult(clientMock);
      await driver.connect();
      await driver.disconnect();
      expect(client.end).toHaveBeenCalledTimes(1);
      expect(driver.isConnected()).toBe(false);
    });
  });

  describe("query execution", () => {
    it("compiles via dialect and forwards SQL+params to pool.query", async () => {
      const driver = new PostgresDriver(baseConfig);
      const pool = lastResult(poolMock);
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }], rowCount: 2 });

      const select: SelectQuery = {
        type: QueryType.SELECT,
        table: { name: "users" },
        columns: [],
      };
      const result = await driver.query(select);

      expect(pool.query).toHaveBeenCalledWith(`SELECT * FROM "users"`, []);
      expect(result).toEqual({ rows: [{ id: 1 }, { id: 2 }], rowCount: 2 });
    });

    it("maps null rowCount to 0", async () => {
      const driver = new PostgresDriver(baseConfig);
      const pool = lastResult(poolMock);
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: null });

      const result = await driver.query({
        type: QueryType.SELECT,
        table: { name: "users" },
        columns: [],
      });
      expect(result.rowCount).toBe(0);
    });

    it("uses the client connection when mode is 'client'", async () => {
      const driver = new PostgresDriver({ ...baseConfig, mode: "client" });
      const client = lastResult(clientMock);
      client.query.mockResolvedValueOnce({ rows: [{ x: 1 }], rowCount: 1 });

      const result = await driver.query({
        type: QueryType.SELECT,
        table: { name: "t" },
        columns: [],
      });
      expect(client.query).toHaveBeenCalledWith(`SELECT * FROM "t"`, []);
      expect(result).toEqual({ rows: [{ x: 1 }], rowCount: 1 });
    });
  });

  describe("getDialect", () => {
    it("returns a PostgresDialect instance", () => {
      const driver = new PostgresDriver(baseConfig);
      expect(driver.getDialect()).toBeInstanceOf(PostgresDialect);
    });
  });
});
