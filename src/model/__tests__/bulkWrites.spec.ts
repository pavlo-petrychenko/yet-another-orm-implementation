import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { Repository } from "@/model/Repository";
import type { Query } from "@/query-builder";
import { QueryType, type InsertQuery, type DeleteQuery } from "@/query-builder/types";

const fakePgConfig: PostgresDriverConfig = {
  type: DBType.POSTGRES,
  host: "x",
  port: 1,
  user: "u",
  password: "p",
  database: "d",
};

@Entity({ name: "bulk_users" })
class BulkUser {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public email!: string;

  @Column({ type: "string", name: "display_name" })
  public displayName!: string;

  @Column({ type: "boolean", name: "is_active" })
  public isActive!: boolean;
}

class FakeDriver implements Driver {
  public calls: Query[] = [];
  public responses: Array<Record<string, unknown>[]> = [];
  public txOpened = 0;
  public failOnQuery: ((q: Query) => boolean) | null = null;

  public connect(): Promise<void> { return Promise.resolve(); }
  public disconnect(): Promise<void> { return Promise.resolve(); }
  public isConnected(): boolean { return true; }
  public getDialect(): Dialect { throw new Error("not used"); }

  public query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>> {
    this.calls.push(query);
    if (this.failOnQuery && this.failOnQuery(query)) {
      return Promise.reject(new Error("forced failure"));
    }
    const rows = this.responses.shift() ?? [];
    return Promise.resolve({ rows: rows as TRow[], rowCount: rows.length });
  }

  public raw<TRow = Record<string, unknown>>(): Promise<QueryResult<TRow>> {
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }

  public async withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R> {
    this.txOpened++;
    return fn(this);
  }
}

function makeDs(driver: FakeDriver): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "driver", { value: driver, writable: false, configurable: true });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

function asInsert(q: Query): InsertQuery {
  if (q.type !== QueryType.INSERT) throw new Error("expected INSERT");
  return q;
}

function asDelete(q: Query): DeleteQuery {
  if (q.type !== QueryType.DELETE) throw new Error("expected DELETE");
  return q;
}

describe("Repository.insertMany", () => {
  it("emits one INSERT with N values rows", async () => {
    const driver = new FakeDriver();
    driver.responses = [[
      { id: 1, email: "a@x", display_name: "A", is_active: true },
      { id: 2, email: "b@x", display_name: "B", is_active: false },
    ]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    const result = await repo.insertMany([
      { email: "a@x", displayName: "A", isActive: true },
      { email: "b@x", displayName: "B", isActive: false },
    ]);

    expect(driver.calls).toHaveLength(1);
    const insert = asInsert(driver.calls[0]);
    expect(insert.values).toHaveLength(2);
    expect(insert.values[0]).toEqual({ email: "a@x", display_name: "A", is_active: true });
    expect(insert.values[1]).toEqual({ email: "b@x", display_name: "B", is_active: false });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it("union of input keys becomes the column set; missing keys filled with undefined", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await repo.insertMany([
      { email: "a@x", displayName: "A" },
      { email: "b@x", isActive: true },
    ]);

    const insert = asInsert(driver.calls[0]);
    const colNames = Object.keys(insert.values[0]).sort();
    expect(colNames).toEqual(["display_name", "email", "is_active"]);
    expect(insert.values[0].display_name).toBe("A");
    expect(insert.values[0].is_active).toBeUndefined();
    expect(insert.values[1].email).toBe("b@x");
    expect(insert.values[1].display_name).toBeUndefined();
  });

  it("empty input throws EMPTY_BULK", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await expect(repo.insertMany([])).rejects.toMatchObject({
      name: "ModelError",
      code: "EMPTY_BULK",
    });
    expect(driver.calls).toHaveLength(0);
  });
});

describe("Repository.deleteMany", () => {
  it("alias of delete — single DELETE with WHERE", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await repo.deleteMany({ isActive: false });

    expect(driver.calls).toHaveLength(1);
    asDelete(driver.calls[0]);
  });
});

describe("Repository.upsert", () => {
  it("emits INSERT ... ON CONFLICT (email) DO UPDATE SET <all-non-conflict> by default", async () => {
    const driver = new FakeDriver();
    driver.responses = [[
      { id: 1, email: "a@x", display_name: "A", is_active: true },
    ]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await repo.upsert({ email: "a@x", displayName: "A", isActive: true }, ["email"]);

    const insert = asInsert(driver.calls[0]);
    expect(insert.onConflict?.targetColumns).toEqual(["email"]);
    expect(insert.onConflict?.updateColumns).toBe("all-non-conflict");
  });

  it("update: 'do-nothing' emits ON CONFLICT DO NOTHING", async () => {
    const driver = new FakeDriver();
    driver.responses = [
      [], // no row returned (DO NOTHING + conflict)
      [{ id: 1, email: "a@x", display_name: "A", is_active: true }], // re-query result
    ];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await repo.upsert({ email: "a@x", displayName: "A" }, ["email"], { update: "do-nothing" });

    const insert = asInsert(driver.calls[0]);
    expect(insert.onConflict?.updateColumns).toBe("do-nothing");
  });

  it("update: ['displayName'] translates property to column", async () => {
    const driver = new FakeDriver();
    driver.responses = [[
      { id: 1, email: "a@x", display_name: "A", is_active: true },
    ]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await repo.upsert(
      { email: "a@x", displayName: "A", isActive: true },
      ["email"],
      { update: ["displayName"] },
    );

    const insert = asInsert(driver.calls[0]);
    expect(insert.onConflict?.updateColumns).toEqual(["display_name"]);
  });

  it("missing conflict key value in data → MISSING_CONFLICT_KEYS", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await expect(
      repo.upsert({ displayName: "A" }, ["email"]),
    ).rejects.toMatchObject({ name: "ModelError", code: "MISSING_CONFLICT_KEYS" });
    expect(driver.calls).toHaveLength(0);
  });

  it("empty conflictKeys → MISSING_CONFLICT_KEYS", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await expect(
      repo.upsert({ email: "a@x" }, []),
    ).rejects.toMatchObject({ name: "ModelError", code: "MISSING_CONFLICT_KEYS" });
  });
});

describe("Repository.saveMany", () => {
  it("opens a transaction once, INSERTs each PK-absent entity", async () => {
    const driver = new FakeDriver();
    driver.responses = [
      [{ id: 1, email: "a@x", display_name: "A", is_active: true }],
      [{ id: 2, email: "b@x", display_name: "B", is_active: false }],
    ];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    const a = repo.create({ email: "a@x", displayName: "A", isActive: true });
    const b = repo.create({ email: "b@x", displayName: "B", isActive: false });
    await repo.saveMany([a, b]);

    expect(driver.txOpened).toBe(1);
    expect(driver.calls).toHaveLength(2);
  });

  it("empty input throws EMPTY_BULK without opening a tx", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    await expect(repo.saveMany([])).rejects.toMatchObject({
      name: "ModelError",
      code: "EMPTY_BULK",
    });
    expect(driver.txOpened).toBe(0);
  });

  it("error during second entity → caller sees the error (rollback is the FakeDriver's responsibility)", async () => {
    const driver = new FakeDriver();
    driver.responses = [
      [{ id: 1, email: "a@x", display_name: "A", is_active: true }],
    ];
    let calls = 0;
    driver.failOnQuery = (): boolean => ++calls === 2;
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    const a = repo.create({ email: "a@x", displayName: "A", isActive: true });
    const b = repo.create({ email: "b@x", displayName: "B", isActive: false });

    await expect(repo.saveMany([a, b])).rejects.toThrow("forced failure");
    expect(driver.txOpened).toBe(1);
  });
});

describe("ModelError surface", () => {
  it("EMPTY_BULK ModelError instance carries the code", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(BulkUser), BulkUser);

    try {
      await repo.insertMany([]);
      fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ModelError);
      expect((err as ModelError).code).toBe("EMPTY_BULK");
    }
  });
});
