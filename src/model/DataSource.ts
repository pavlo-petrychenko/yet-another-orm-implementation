import { DriverFactory } from "@/drivers/DriverFactory";
import type { Driver } from "@/drivers/common/Driver";
import { defaultMetadataStorage } from "@/metadata/storage";
import type { EntityMetadata, EntityTarget } from "@/metadata/types";
import { ModelError } from "@/model/errors/ModelError";
import { Repository } from "@/model/Repository";
import { repositoryRegistry } from "@/model/repositoryRegistry";
import type { DataSourceOptions } from "@/model/types/DataSourceOptions";

type State = "new" | "connected" | "destroyed";

export class DataSource {
  private readonly driver: Driver;
  private readonly repositories = new Map<EntityTarget, Repository<object>>();
  private state: State = "new";

  public constructor(options: DataSourceOptions) {
    this.driver = new DriverFactory().create(options.driver);
  }

  public async initialize(): Promise<void> {
    if (this.state !== "new") {
      throw new ModelError(
        "DATA_SOURCE_ALREADY_INITIALIZED",
        `DataSource cannot be initialized from state "${this.state}"`,
      );
    }
    await this.driver.connect();
    this.state = "connected";
  }

  public async destroy(): Promise<void> {
    if (this.state === "destroyed") return;
    await this.driver.disconnect();
    this.state = "destroyed";
    this.repositories.clear();
  }

  public isInitialized(): boolean {
    return this.state === "connected";
  }

  public getRepository<T extends object>(entity: EntityTarget<T>): Repository<T> {
    if (this.state === "new") {
      throw new ModelError(
        "DATA_SOURCE_NOT_INITIALIZED",
        "DataSource has not been initialized. Call initialize() before getRepository().",
      );
    }
    if (this.state === "destroyed") {
      throw new ModelError(
        "DATA_SOURCE_DESTROYED",
        "DataSource has been destroyed and can no longer be used.",
      );
    }

    const cached = this.repositories.get(entity as EntityTarget);
    if (cached) return cached as Repository<T>;

    const metadata = defaultMetadataStorage.getEntity(entity as EntityTarget);
    if (!metadata) {
      const name = (entity as { name?: string }).name ?? "<anonymous>";
      throw new ModelError(
        "ENTITY_NOT_REGISTERED",
        `Entity "${name}" is not registered with the metadata storage. Did you forget @Entity?`,
      );
    }

    const customCtor = repositoryRegistry.get(entity);
    const repo: Repository<T> = customCtor
      ? new customCtor(this, metadata, entity)
      : new Repository<T>(this, metadata, entity);

    this.repositories.set(entity as EntityTarget, repo as Repository<object>);
    return repo;
  }

  /** @internal */
  public getDriver(): Driver {
    return this.driver;
  }

  /** @internal */
  public getMetadata<T>(entity: EntityTarget<T>): EntityMetadata {
    const metadata = defaultMetadataStorage.getEntity(entity as EntityTarget);
    if (!metadata) {
      const name = (entity as { name?: string }).name ?? "<anonymous>";
      throw new ModelError("ENTITY_NOT_REGISTERED", `Entity "${name}" is not registered.`);
    }
    return metadata;
  }
}
