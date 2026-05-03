import type { Driver } from "@/drivers/common/Driver";
import { defaultMetadataStorage } from "@/metadata/storage";
import type { EntityTarget } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { Repository } from "@/model/Repository";
import { repositoryRegistry, type RepositoryCtor } from "@/model/repositoryRegistry";

export class EntityManager {
  private readonly dataSource: DataSource;
  private readonly tx: Driver;
  private readonly closedRef: { value: boolean };
  private readonly repos = new Map<EntityTarget, Repository<object>>();

  /** @internal */
  public constructor(dataSource: DataSource, tx: Driver, closedRef: { value: boolean }) {
    this.dataSource = dataSource;
    this.tx = tx;
    this.closedRef = closedRef;
  }

  public isClosed(): boolean {
    return this.closedRef.value;
  }

  public getRepository<T extends object>(
    entity: EntityTarget<T>,
    custom?: RepositoryCtor<T>,
  ): Repository<T> {
    this.assertOpen();

    const cached = this.repos.get(entity as EntityTarget);
    if (cached && !custom) return cached as Repository<T>;

    const metadata = defaultMetadataStorage.getEntity(entity as EntityTarget);
    if (!metadata) {
      const name = (entity as { name?: string }).name ?? "<anonymous>";
      throw new ModelError(
        "ENTITY_NOT_REGISTERED",
        `Entity "${name}" is not registered with the metadata storage. Did you forget @Entity?`,
      );
    }

    const ctor = custom ?? repositoryRegistry.get(entity);
    const repo: Repository<T> = ctor
      ? new ctor(this.dataSource, metadata, entity, this.tx)
      : new Repository<T>(this.dataSource, metadata, entity, this.tx);

    if (!custom) {
      this.repos.set(entity as EntityTarget, repo as Repository<object>);
    }
    return repo;
  }

  public async query<TRow = unknown>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<TRow[]> {
    this.assertOpen();
    const result = await this.tx.raw(sql, params);
    return result.rows as TRow[];
  }

  public async raw<TRow = unknown>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<TRow[]> {
    return this.query<TRow>(sql, params);
  }

  private assertOpen(): void {
    if (this.closedRef.value) {
      throw new ModelError(
        "TRANSACTION_CLOSED",
        "EntityManager has been closed; the transaction callback already returned.",
      );
    }
  }
}
