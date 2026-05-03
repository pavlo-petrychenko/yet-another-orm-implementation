import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { defaultMetadataStorage } from "@/metadata/storage";
import { DataSource } from "@/model/DataSource";
import { EntityManager } from "@/model/EntityManager";
import { ModelError } from "@/model/errors/ModelError";
import { Repository } from "@/model/Repository";
import { repositoryRegistry } from "@/model/repositoryRegistry";
import type { Query } from "@/query-builder";

const fakePgConfig: PostgresDriverConfig = {
  type: DBType.POSTGRES,
  host: "x",
  port: 1,
  user: "u",
  password: "p",
  database: "d",
};

class TaggedDriver implements Driver {
  public readonly tag: string;
  public calls: { type: "query" | "raw"; sql?: string }[] = [];

  public constructor(tag: string) {
    this.tag = tag;
  }
  public connect(): Promise<void> { return Promise.resolve(); }
  public disconnect(): Promise<void> { return Promise.resolve(); }
  public isConnected(): boolean { return true; }
  public getDialect(): Dialect { throw new Error("unused"); }
  public query<TRow = Record<string, unknown>>(_query: Query): Promise<QueryResult<TRow>> {
    this.calls.push({ type: "query" });
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public raw<TRow = Record<string, unknown>>(sql: string): Promise<QueryResult<TRow>> {
    this.calls.push({ type: "raw", sql });
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R> {
    return fn(this);
  }
}

@Entity({ name: "users" })
class User {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public email!: string;
}

function makeDataSourceWithDriver(driver: Driver): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "driver", { value: driver, writable: false, configurable: true });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

describe("EntityManager", () => {
  beforeEach(() => {
    repositoryRegistry.clear();
  });

  it("getRepository returns a Repository routed through the tx driver", async () => {
    const mainDriver = new TaggedDriver("main");
    const txDriver = new TaggedDriver("tx");
    const ds = makeDataSourceWithDriver(mainDriver);
    const em = new EntityManager(ds, txDriver, { value: false });

    const repo = em.getRepository(User);
    await repo.find();

    expect(txDriver.calls).toHaveLength(1);
    expect(mainDriver.calls).toHaveLength(0);
  });

  it("caches per-EM Repository instances", () => {
    const txDriver = new TaggedDriver("tx");
    const ds = makeDataSourceWithDriver(new TaggedDriver("main"));
    const em = new EntityManager(ds, txDriver, { value: false });

    const a = em.getRepository(User);
    const b = em.getRepository(User);
    expect(a).toBe(b);
  });

  it("custom repository ctor is honored and constructed with txDriver", () => {
    class UserRepo extends Repository<User> {}
    const txDriver = new TaggedDriver("tx");
    const ds = makeDataSourceWithDriver(new TaggedDriver("main"));
    const em = new EntityManager(ds, txDriver, { value: false });

    const repo = em.getRepository(User, UserRepo);
    expect(repo).toBeInstanceOf(UserRepo);
  });

  it("query() routes raw SQL through the tx driver", async () => {
    const txDriver = new TaggedDriver("tx");
    const ds = makeDataSourceWithDriver(new TaggedDriver("main"));
    const em = new EntityManager(ds, txDriver, { value: false });

    await em.query("SELECT 1");

    expect(txDriver.calls).toEqual([{ type: "raw", sql: "SELECT 1" }]);
  });

  it("isClosed flips after the closedRef is set", () => {
    const closedRef = { value: false };
    const em = new EntityManager(makeDataSourceWithDriver(new TaggedDriver("m")), new TaggedDriver("t"), closedRef);

    expect(em.isClosed()).toBe(false);
    closedRef.value = true;
    expect(em.isClosed()).toBe(true);
  });

  it("getRepository after close throws TRANSACTION_CLOSED", () => {
    const closedRef = { value: false };
    const em = new EntityManager(makeDataSourceWithDriver(new TaggedDriver("m")), new TaggedDriver("t"), closedRef);
    closedRef.value = true;

    expect(() => em.getRepository(User)).toThrow(ModelError);
    expect(() => em.getRepository(User)).toThrow(/TRANSACTION_CLOSED|closed/);
  });

  it("query after close throws TRANSACTION_CLOSED", async () => {
    const closedRef = { value: false };
    const em = new EntityManager(makeDataSourceWithDriver(new TaggedDriver("m")), new TaggedDriver("t"), closedRef);
    closedRef.value = true;

    await expect(em.query("SELECT 1")).rejects.toThrow(/closed/);
  });

  it("getRepository throws ENTITY_NOT_REGISTERED for unknown class", () => {
    class NotAnEntity {
      public x?: number;
    }
    const em = new EntityManager(makeDataSourceWithDriver(new TaggedDriver("m")), new TaggedDriver("t"), { value: false });

    expect(() => em.getRepository(NotAnEntity as never)).toThrow(/ENTITY_NOT_REGISTERED|not registered/);
  });

  // ensure User stays registered for downstream describes (defaultMetadataStorage is shared)
  afterAll(() => {
    expect(defaultMetadataStorage.getEntity(User)).toBeDefined();
  });
});
