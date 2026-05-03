import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { DataSource } from "@/model/DataSource";
import { Repository } from "@/model/Repository";
import type { Relation } from "@/model/types/Relation";
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

@Entity({ name: "sp_users" })
class SpUser {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public name!: string;

  @Column({ type: "string" })
  public email!: string;

  @OneToMany(() => SpOrder, { inverseSide: "user" })
  public orders!: Relation<SpOrder[]>;

  @ManyToMany(() => SpTag, {
    joinTable: {
      name: "sp_user_tags",
      joinColumn: { name: "user_id" },
      inverseJoinColumn: { name: "tag_id" },
    },
    inverseSide: "users",
  })
  public tags!: Relation<SpTag[]>;
}

@Entity({ name: "sp_orders" })
class SpOrder {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "string" })
  public total!: string;

  @ManyToOne(() => SpUser, { joinColumn: { name: "user_id" }, inverseSide: "orders" })
  public user!: Relation<SpUser>;
}

@Entity({ name: "sp_tags" })
class SpTag {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public label!: string;

  @ManyToMany(() => SpUser, { inverseSide: "tags" })
  public users!: Relation<SpUser[]>;
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

function makeDs(driver: FakeDriver): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "driver", { value: driver, writable: false, configurable: true });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

function asSelect(q: Query): SelectQuery {
  if (q.type !== QueryType.SELECT) throw new Error("expected SELECT");
  return q;
}

function pickedColumnNames(q: SelectQuery): string[] {
  return q.columns.map((c) => c.name);
}

describe("Repository select pruning", () => {
  it("no select → emits all columns", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(SpUser), SpUser);

    await repo.find();

    expect(driver.calls).toHaveLength(1);
    const cols = pickedColumnNames(asSelect(driver.calls[0]));
    expect(cols).toEqual(["id", "name", "email"]);
  });

  it("select { id, name } → emits exactly those columns", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(SpUser), SpUser);

    await repo.find({ select: { id: true, name: true } });

    const cols = pickedColumnNames(asSelect(driver.calls[0]));
    expect(cols).toEqual(["id", "name"]);
  });

  it("select { name } → auto-adds PK (id) to keep relation loading viable", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(SpUser), SpUser);

    await repo.find({ select: { name: true } });

    const cols = pickedColumnNames(asSelect(driver.calls[0]));
    expect(cols).toContain("id");
    expect(cols).toContain("name");
    expect(cols).not.toContain("email");
  });

  it("select { id } + include user (M2O) → auto-adds FK column user_id", async () => {
    const driver = new FakeDriver();
    driver.responses = [[], []];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(SpOrder), SpOrder);

    await repo.find({ select: { id: true }, include: { user: true } });

    const parentCols = pickedColumnNames(asSelect(driver.calls[0]));
    expect(parentCols).toContain("id");
    expect(parentCols).toContain("user_id");
    expect(parentCols).not.toContain("total");
  });

  it("select { id } + include orders (O2M inverse) → no parent FK auto-added", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(SpUser), SpUser);

    await repo.find({ select: { id: true }, include: { orders: true } });

    const parentCols = pickedColumnNames(asSelect(driver.calls[0]));
    expect(parentCols).toEqual(["id"]);
  });

  it("select { id } + include tags (M2M owning) → no parent FK auto-added", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(SpUser), SpUser);

    await repo.find({ select: { id: true }, include: { tags: true } });

    const parentCols = pickedColumnNames(asSelect(driver.calls[0]));
    expect(parentCols).toEqual(["id"]);
  });

  it("findOne with select → same pruning behavior", async () => {
    const driver = new FakeDriver();
    driver.responses = [[]];
    const ds = makeDs(driver);
    const repo = new Repository(ds, ds.getMetadata(SpUser), SpUser);

    await repo.findOne({ select: { name: true } });

    const cols = pickedColumnNames(asSelect(driver.calls[0]));
    expect(cols).toContain("id");
    expect(cols).toContain("name");
    expect(cols).not.toContain("email");
  });
});
