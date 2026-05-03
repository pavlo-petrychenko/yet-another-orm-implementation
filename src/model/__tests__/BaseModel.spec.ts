import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import { defaultMetadataStorage } from "@/metadata/storage";
import { BaseModel } from "@/model/BaseModel";
import { DataSource } from "@/model/DataSource";
import { clearDataSource, setDataSource } from "@/model/dataSourceRegistry";
import { Repository } from "@/model/Repository";
import { repositoryRegistry } from "@/model/repositoryRegistry";

const fakePgConfig: PostgresDriverConfig = {
  type: DBType.POSTGRES,
  host: "x",
  port: 1,
  user: "u",
  password: "p",
  database: "d",
};

interface StubRepoBundle {
  StubRepo: new (...args: unknown[]) => Repository<object>;
  calls: Array<{ method: string; args: unknown[] }>;
}

function makeStubRepoCtor(): StubRepoBundle {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  class StubRepo extends Repository<object> {
    public override findOne = jest.fn((...args: unknown[]) => {
      calls.push({ method: "findOne", args });
      return Promise.resolve(null);
    });
    public override findOneOrFail = jest.fn((...args: unknown[]) => {
      calls.push({ method: "findOneOrFail", args });
      return Promise.resolve({ id: 1 } as object);
    }) as unknown as Repository<object>["findOneOrFail"];
    public override find = jest.fn((...args: unknown[]) => {
      calls.push({ method: "find", args });
      return Promise.resolve([] as object[]);
    }) as unknown as Repository<object>["find"];
    public override count = jest.fn((...args: unknown[]) => {
      calls.push({ method: "count", args });
      return Promise.resolve(0);
    });
    public override exists = jest.fn((...args: unknown[]) => {
      calls.push({ method: "exists", args });
      return Promise.resolve(false);
    });
    public override insert = jest.fn((...args: unknown[]) => {
      calls.push({ method: "insert", args });
      return Promise.resolve({ id: 99 } as object);
    });
    public override save = jest.fn((entity: object) => {
      calls.push({ method: "save", args: [entity] });
      return Promise.resolve(entity);
    });
    public override delete = jest.fn((...args: unknown[]) => {
      calls.push({ method: "delete", args });
      return Promise.resolve(1);
    });
  }

  return { StubRepo, calls };
}

function newDsConnected(): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

describe("BaseModel", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
    repositoryRegistry.clear();
    clearDataSource();
  });

  it("static findOne delegates to repository.findOne with args", async () => {
    @Entity()
    class User extends BaseModel {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }

    const { StubRepo, calls } = makeStubRepoCtor();
    repositoryRegistry.register(User, StubRepo as never);
    setDataSource(newDsConnected());

    await User.findOne({ where: { id: 1 } });
    expect(calls).toEqual([{ method: "findOne", args: [{ where: { id: 1 } }] }]);
  });

  it("instance save() delegates to repository.save with the same instance", async () => {
    @Entity()
    class Post extends BaseModel {
      @PrimaryKey({ type: "integer" })
      public id!: number;

      @Column({ type: "string" })
      public title!: string;
    }

    const { StubRepo, calls } = makeStubRepoCtor();
    repositoryRegistry.register(Post, StubRepo as never);
    setDataSource(newDsConnected());

    const post = new Post();
    post.id = 5;
    post.title = "x";
    await post.save();

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("save");
    expect(calls[0].args[0]).toBe(post);
  });

  it("instance delete() builds a PK where and calls repository.delete", async () => {
    @Entity()
    class Tag extends BaseModel {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }

    const { StubRepo, calls } = makeStubRepoCtor();
    repositoryRegistry.register(Tag, StubRepo as never);
    setDataSource(newDsConnected());

    const tag = new Tag();
    tag.id = 7;
    await tag.delete();

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("delete");
    expect(calls[0].args).toEqual([{ id: 7 }]);
  });

  it("useDataSource overrides the global resolution per class", async () => {
    @Entity()
    class Cat extends BaseModel {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }

    const { StubRepo: stubA, calls: callsA } = makeStubRepoCtor();
    const { StubRepo: stubB, calls: callsB } = makeStubRepoCtor();
    repositoryRegistry.register(Cat, stubA as never);

    const dsA = newDsConnected();
    const dsB = newDsConnected();
    setDataSource(dsA);

    // Override the class to use dsB; both data sources share the same registry,
    // so dsB will instantiate a separate stubA-typed repository instance.
    // Replace registry mid-way to simulate a per-DS swap.
    Cat.useDataSource(dsB);
    repositoryRegistry.clear();
    repositoryRegistry.register(Cat, stubB as never);

    await Cat.findOne({ where: { id: 1 } });
    expect(callsA).toHaveLength(0);
    expect(callsB).toHaveLength(1);
  });
});
