import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import { defaultMetadataStorage } from "@/metadata/storage";
import { DataSource } from "@/model/DataSource";
import { clearDataSource, getDataSource, setDataSource } from "@/model/dataSourceRegistry";
import { ModelError } from "@/model/errors/ModelError";
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

function newDs(): DataSource {
  return new DataSource({ driver: fakePgConfig });
}

function markConnected(ds: DataSource): void {
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
}
function markDestroyed(ds: DataSource): void {
  Object.defineProperty(ds, "state", { value: "destroyed", writable: true, configurable: true });
}

describe("DataSource", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
    repositoryRegistry.clear();
    clearDataSource();
  });

  it("getRepository before initialize throws DATA_SOURCE_NOT_INITIALIZED", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }
    const ds = newDs();
    expect(() => ds.getRepository(User)).toThrow(ModelError);
    expect(() => ds.getRepository(User)).toThrow(/DATA_SOURCE_NOT_INITIALIZED|not been initialized/);
  });

  it("getRepository after destroy throws DATA_SOURCE_DESTROYED", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }
    const ds = newDs();
    markDestroyed(ds);
    expect(() => ds.getRepository(User)).toThrow(/destroyed/i);
  });

  it("entity without @EntityRepository returns plain Repository", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }
    const ds = newDs();
    markConnected(ds);
    const repo = ds.getRepository(User);
    expect(repo).toBeInstanceOf(Repository);
    expect(repo.constructor.name).toBe("Repository");
  });

  it("entity with @EntityRepository returns the registered subclass", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }
    class UserRepository extends Repository<User> {
      public ping(): string { return "pong"; }
    }
    repositoryRegistry.register(User, UserRepository);

    const ds = newDs();
    markConnected(ds);
    const repo = ds.getRepository(User);
    expect(repo).toBeInstanceOf(UserRepository);
    expect((repo as UserRepository).ping()).toBe("pong");
  });

  it("getRepository caches per DataSource instance", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }
    const ds = newDs();
    markConnected(ds);
    expect(ds.getRepository(User)).toBe(ds.getRepository(User));
  });

  it("unregistered entity throws ENTITY_NOT_REGISTERED", () => {
    class StrayEntity {
      public id!: number;
    }
    const ds = newDs();
    markConnected(ds);
    expect(() => ds.getRepository(StrayEntity)).toThrow(/not registered/i);
  });
});

describe("dataSourceRegistry", () => {
  beforeEach(() => {
    clearDataSource();
  });

  it("setDataSource / getDataSource round trip", () => {
    const ds = newDs();
    setDataSource(ds);
    expect(getDataSource()).toBe(ds);
  });

  it("getDataSource before set throws NO_DATA_SOURCE", () => {
    expect(() => getDataSource()).toThrow(ModelError);
    expect(() => getDataSource()).toThrow(/NO_DATA_SOURCE|No DataSource has been set/);
  });

  it("clearDataSource resets to unset", () => {
    setDataSource(newDs());
    clearDataSource();
    expect(() => getDataSource()).toThrow();
  });
});
