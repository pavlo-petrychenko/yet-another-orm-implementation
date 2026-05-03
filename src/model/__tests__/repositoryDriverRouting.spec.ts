import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { DataSource } from "@/model/DataSource";
import { Repository } from "@/model/Repository";
import { runInTx, type TxContext } from "@/model/transactionContext";
import type { EntityManager } from "@/model/EntityManager";
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
  public queries = 0;

  public constructor(tag: string) { this.tag = tag; }
  public connect(): Promise<void> { return Promise.resolve(); }
  public disconnect(): Promise<void> { return Promise.resolve(); }
  public isConnected(): boolean { return true; }
  public getDialect(): Dialect { throw new Error("unused"); }
  public query<TRow = Record<string, unknown>>(_q: Query): Promise<QueryResult<TRow>> {
    this.queries += 1;
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public raw<TRow = Record<string, unknown>>(): Promise<QueryResult<TRow>> {
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R> { return fn(this); }
}

@Entity({ name: "users" })
class User {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public email!: string;
}

function makeDs(driver: Driver): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "driver", { value: driver, writable: false, configurable: true });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

function makeCtx(ds: DataSource, tx: Driver): TxContext {
  return { ds, tx, em: {} as EntityManager, closed: { value: false } };
}

describe("Repository driver routing", () => {
  it("uses ds.getDriver() when no txDriver and no ambient", async () => {
    const main = new TaggedDriver("main");
    const ds = makeDs(main);
    const repo = ds.getRepository(User);

    await repo.find();
    expect(main.queries).toBe(1);
  });

  it("uses ambient tx driver when present", async () => {
    const main = new TaggedDriver("main");
    const tx = new TaggedDriver("ambient-tx");
    const ds = makeDs(main);
    const repo = ds.getRepository(User);

    await runInTx(makeCtx(ds, tx), async () => {
      await repo.find();
    });

    expect(tx.queries).toBe(1);
    expect(main.queries).toBe(0);
  });

  it("ambient tx for a different DataSource is ignored", async () => {
    const mainA = new TaggedDriver("mainA");
    const txB = new TaggedDriver("ambient-B");
    const dsA = makeDs(mainA);
    const dsB = makeDs(new TaggedDriver("mainB"));
    const repoA = dsA.getRepository(User);

    await runInTx(makeCtx(dsB, txB), async () => {
      await repoA.find();
    });

    expect(mainA.queries).toBe(1);
    expect(txB.queries).toBe(0);
  });

  it("txDriver beats ambient (precedence)", async () => {
    const main = new TaggedDriver("main");
    const ambient = new TaggedDriver("ambient");
    const bound = new TaggedDriver("bound");
    const ds = makeDs(main);

    const metadata = ds.getMetadata(User);
    const repo = new Repository<User>(ds, metadata, User, bound);

    await runInTx(makeCtx(ds, ambient), async () => {
      await repo.find();
    });

    expect(bound.queries).toBe(1);
    expect(ambient.queries).toBe(0);
    expect(main.queries).toBe(0);
  });

  it("ambient tx is ignored after closed flag flips", async () => {
    const main = new TaggedDriver("main");
    const tx = new TaggedDriver("tx");
    const ds = makeDs(main);
    const repo = ds.getRepository(User);
    const ctx = makeCtx(ds, tx);

    await runInTx(ctx, async () => {
      ctx.closed.value = true;
      await repo.find();
    });

    expect(main.queries).toBe(1);
    expect(tx.queries).toBe(0);
  });
});
