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
import type { Repository } from "@/model/Repository";
import type { Query } from "@/query-builder";
import { QueryType, type SelectQuery } from "@/query-builder/types";

const fakePgConfig: PostgresDriverConfig = {
  type: DBType.POSTGRES,
  host: "x",
  port: 1,
  user: "u",
  password: "p",
  database: "d",
};

@Entity({ name: "users" })
class User {
  public constructorRan = false;

  public constructor() {
    this.constructorRan = true;
  }

  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string", name: "display_name" })
  public displayName!: string;

  @Column({ type: "boolean", name: "is_active" })
  public isActive!: boolean;

  public greet(): string {
    return `hi ${this.displayName}`;
  }
}

@Entity({ name: "no_pk" })
class NoPkEntity {
  @Column({ type: "string" })
  public name!: string;
}

interface RecordedCall {
  type: "query" | "raw";
  query?: Query;
  sql?: string;
  params?: readonly unknown[];
}

class FakeDriver implements Driver {
  public calls: RecordedCall[] = [];
  public nextRows: Record<string, unknown>[] = [];
  public nextRowCount = 0;

  public connect(): Promise<void> { return Promise.resolve(); }
  public disconnect(): Promise<void> { return Promise.resolve(); }
  public isConnected(): boolean { return true; }
  public getDialect(): Dialect {
    throw new Error("getDialect not used by Repository unit tests");
  }
  public query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>> {
    this.calls.push({ type: "query", query });
    return Promise.resolve({ rows: this.nextRows as TRow[], rowCount: this.nextRowCount });
  }
  public raw<TRow = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<QueryResult<TRow>> {
    this.calls.push({ type: "raw", sql, params });
    return Promise.resolve({ rows: this.nextRows as TRow[], rowCount: this.nextRowCount });
  }

  public lastQuery(): Query {
    const last = this.calls[this.calls.length - 1];
    if (last.type !== "query" || !last.query) throw new Error("last call was not a structured query");
    return last.query;
  }

  public reset(): void {
    this.calls = [];
    this.nextRows = [];
    this.nextRowCount = 0;
  }
}

function makeDataSourceWithFake(driver: FakeDriver): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "driver", { value: driver, writable: false, configurable: true });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

interface UserFixture {
  driver: FakeDriver;
  ds: DataSource;
  repo: Repository<User>;
}

function makeFixture(): UserFixture {
  const driver = new FakeDriver();
  const ds = makeDataSourceWithFake(driver);
  const repo = ds.getRepository(User);
  return { driver, ds, repo };
}

describe("Repository (unit)", () => {

  it("findOne builds SELECT with LIMIT 1 and uses where", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [{ id: 1, display_name: "A", is_active: true }];
    driver.nextRowCount = 1;

    const result = await repo.findOne({ where: { id: 1 } });

    const q = driver.lastQuery() as SelectQuery;
    expect(q.type).toBe(QueryType.SELECT);
    expect(q.limit?.count).toBe(1);
    expect(q.where).toBeDefined();
    expect(result?.id).toBe(1);
    expect(result?.displayName).toBe("A");
  });

  it("findOne returns null when driver returns no rows", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [];
    driver.nextRowCount = 0;
    expect(await repo.findOne({ where: { id: 99 } })).toBeNull();
  });

  it("findOneOrFail throws NOT_FOUND when no rows", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [];
    driver.nextRowCount = 0;
    await expect(repo.findOneOrFail({ where: { id: 99 } })).rejects.toBeInstanceOf(ModelError);
  });

  it("find honors take and skip as limit and offset", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [];
    driver.nextRowCount = 0;
    await repo.find({ take: 5, skip: 10 });
    const q = driver.lastQuery() as SelectQuery;
    expect(q.limit?.count).toBe(5);
    expect(q.offset?.count).toBe(10);
  });

  it("count returns numeric COUNT(*) result", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [{ count: "42" }];
    driver.nextRowCount = 1;
    const total = await repo.count();
    expect(total).toBe(42);
  });

  it("exists returns true when a row matches", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [{ id: 1, display_name: "x", is_active: true }];
    driver.nextRowCount = 1;
    expect(await repo.exists({ id: 1 })).toBe(true);
  });

  it("exists returns false when no row matches", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [];
    driver.nextRowCount = 0;
    expect(await repo.exists({ id: 99 })).toBe(false);
  });

  it("create does not call the driver and bypasses the user constructor", () => {
    const { driver, repo } = makeFixture();
    const instance = repo.create({ id: 1, displayName: "A", isActive: true });

    expect(driver.calls).toHaveLength(0);
    expect(instance.id).toBe(1);
    expect(instance.displayName).toBe("A");
    expect(instance.constructorRan).toBeUndefined();
    expect(instance.greet()).toBe("hi A");
  });

  it("insert builds INSERT with RETURNING and hydrates", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [{ id: 1, display_name: "A", is_active: true }];
    driver.nextRowCount = 1;
    const result = await repo.insert({ displayName: "A", isActive: true });

    const q = driver.lastQuery();
    expect(q.type).toBe(QueryType.INSERT);
    expect(result.id).toBe(1);
    expect(result.greet()).toBe("hi A");
  });

  it("update with empty patch throws EMPTY_UPDATE", async () => {
    const { repo } = makeFixture();
    await expect(repo.update({ id: 1 }, {})).rejects.toMatchObject({ code: "EMPTY_UPDATE" });
  });

  it("update returns the driver rowCount", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRowCount = 3;
    const count = await repo.update({ id: 1 }, { displayName: "B" });
    expect(count).toBe(3);
  });

  it("delete returns the driver rowCount", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRowCount = 2;
    expect(await repo.delete({ id: 1 })).toBe(2);
  });

  it("save with PK present takes the UPDATE path", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRowCount = 1;
    driver.nextRows = [{ id: 1, display_name: "B", is_active: true }];

    const entity = repo.create({ id: 1, displayName: "B", isActive: true });
    await repo.save(entity);

    const updateCall = driver.calls.find((c) => c.type === "query" && c.query?.type === QueryType.UPDATE);
    expect(updateCall).toBeDefined();
  });

  it("save with PK missing takes the INSERT path", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRowCount = 1;
    driver.nextRows = [{ id: 7, display_name: "B", is_active: true }];

    const entity = repo.create({ displayName: "B", isActive: true });
    await repo.save(entity);

    const insertCall = driver.calls.find((c) => c.type === "query" && c.query?.type === QueryType.INSERT);
    expect(insertCall).toBeDefined();
    expect(entity.id).toBe(7);
  });

  it("query() delegates to driver.raw", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [{ count: 5 }];
    driver.nextRowCount = 1;
    const rows = await repo.query("SELECT 1", []);
    expect(driver.calls[0].type).toBe("raw");
    expect(driver.calls[0].sql).toBe("SELECT 1");
    expect(rows).toEqual([{ count: 5 }]);
  });

  it("hydration walks columns by columnName not propertyName", async () => {
    const { driver, repo } = makeFixture();
    driver.nextRows = [{
      id: 1,
      display_name: "fromDb",
      is_active: true,
      // these would mismatch on propertyName-based hydration:
      displayName: "shouldBeIgnored",
      isActive: false,
    }];
    driver.nextRowCount = 1;
    const result = await repo.findOne({ where: { id: 1 } });
    expect(result?.displayName).toBe("fromDb");
    expect(result?.isActive).toBe(true);
  });
});

describe("Repository.save without PKs", () => {
  it("throws NO_PRIMARY_KEY", async () => {
    const driver = new FakeDriver();
    const ds = makeDataSourceWithFake(driver);
    const repo: Repository<NoPkEntity> = ds.getRepository(NoPkEntity);
    await expect(repo.save(repo.create({ name: "x" }))).rejects.toMatchObject({ code: "NO_PRIMARY_KEY" });
  });
});
