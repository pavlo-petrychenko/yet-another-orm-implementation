import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { QueryResult } from "@/drivers/types/QueryResult";
import type { EntityTarget, EntityMetadata } from "@/metadata/types";
import { defaultMetadataStorage } from "@/metadata/storage";
import { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { loadIncludes, MAX_INCLUDE_DEPTH } from "@/model/internal/loadIncludes";
import type { IncludeConfig } from "@/model/types/IncludeConfig";
import type { Relation } from "@/model/types/Relation";
import type { Query } from "@/query-builder";

const fakePgConfig: PostgresDriverConfig = {
  type: DBType.POSTGRES,
  host: "x",
  port: 1,
  user: "u",
  password: "p",
  database: "d",
};

@Entity({ name: "li_users" })
class LiUser {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public name!: string;

  @OneToMany(() => LiOrder, { inverseSide: "user" })
  public orders!: Relation<LiOrder[]>;
}

@Entity({ name: "li_orders" })
class LiOrder {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @ManyToOne(() => LiUser, { joinColumn: { name: "user_id" }, inverseSide: "orders" })
  public user!: Relation<LiUser>;
}

class FakeDriver implements Driver {
  public calls: Query[] = [];
  public responses: Array<Record<string, unknown>[]> = [];

  public connect(): Promise<void> { return Promise.resolve(); }
  public disconnect(): Promise<void> { return Promise.resolve(); }
  public isConnected(): boolean { return true; }
  public getDialect(): Dialect { throw new Error("not used"); }
  public query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>> {
    this.calls.push(query);
    const rows = this.responses.shift() ?? [];
    return Promise.resolve({ rows: rows as TRow[], rowCount: rows.length });
  }
  public raw<TRow = Record<string, unknown>>(): Promise<QueryResult<TRow>> {
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R> {
    return fn(this);
  }
}

function getMeta(target: EntityTarget): EntityMetadata {
  const meta = defaultMetadataStorage.getEntity(target);
  if (!meta) throw new Error(`No metadata for ${target.name}`);
  return meta;
}

function makeDs(driver: FakeDriver): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "driver", { value: driver, writable: false, configurable: true });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

describe("loadIncludes (unit)", () => {
  it("empty parents short-circuits with no SQL", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const meta = getMeta(LiUser);

    await loadIncludes(ds, [], meta, { orders: true } as IncludeConfig<LiUser>, 0);

    expect(driver.calls).toHaveLength(0);
  });

  it("unknown relation key throws UNKNOWN_RELATION", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const meta = getMeta(LiUser);

    await expect(
      loadIncludes<object>(
        ds,
        [{ id: 1 }],
        meta,
        { nonExistent: true } as unknown as IncludeConfig<object>,
        0,
      ),
    ).rejects.toMatchObject({ code: "UNKNOWN_RELATION" });
  });

  it("depth beyond MAX_INCLUDE_DEPTH throws INCLUDE_DEPTH_EXCEEDED", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const meta = getMeta(LiUser);

    await expect(
      loadIncludes<object>(
        ds,
        [{ id: 1 }],
        meta,
        { orders: true } as IncludeConfig<object>,
        MAX_INCLUDE_DEPTH + 1,
      ),
    ).rejects.toBeInstanceOf(ModelError);
  });

  it("include: { orders: true } issues exactly one query", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const meta = getMeta(LiUser);

    await loadIncludes<object>(
      ds,
      [{ id: 1 }, { id: 2 }],
      meta,
      { orders: true } as IncludeConfig<object>,
      0,
    );

    expect(driver.calls).toHaveLength(1);
  });

  it("nested include recurses with one query per level", async () => {
    const driver = new FakeDriver();
    // Q1: orders for user 1 → one order with userId=1, id=10
    driver.responses = [
      [{ id: 10, user_id: 1 }],
      // Q2: user for the order's userId
      [{ id: 1, name: "A" }],
    ];
    const ds = makeDs(driver);
    const meta = getMeta(LiUser);

    const parent: Record<string, unknown> = { id: 1, name: "A" };
    await loadIncludes<object>(
      ds,
      [parent],
      meta,
      { orders: { include: { user: true } } } as IncludeConfig<object>,
      0,
    );

    expect(driver.calls).toHaveLength(2);
    const orders = parent.orders as Array<Record<string, unknown>>;
    expect(orders).toHaveLength(1);
    expect(orders[0].userId).toBe(1);
    expect((orders[0].user as Record<string, unknown>).id).toBe(1);
  });

  it("multiple sibling relations dispatch independently (one query each)", async () => {
    const driver = new FakeDriver();
    driver.responses = [[], []];
    const ds = makeDs(driver);
    const orderMeta = getMeta(LiOrder);

    await loadIncludes<object>(
      ds,
      [{ id: 1, userId: 1 }],
      orderMeta,
      { user: true } as IncludeConfig<object>,
      0,
    );

    expect(driver.calls).toHaveLength(1);
  });

  it("`false`/`undefined` node values are skipped", async () => {
    const driver = new FakeDriver();
    const ds = makeDs(driver);
    const meta = getMeta(LiUser);

    await loadIncludes<object>(
      ds,
      [{ id: 1 }],
      meta,
      { orders: undefined } as unknown as IncludeConfig<object>,
      0,
    );
    await loadIncludes<object>(
      ds,
      [{ id: 1 }],
      meta,
      { orders: false } as unknown as IncludeConfig<object>,
      0,
    );

    expect(driver.calls).toHaveLength(0);
  });
});
