import type { EntityMetadata, EntityTarget } from "@/metadata/types";
import { ModelError } from "@/model/errors/ModelError";
import type { DataSource } from "@/model/DataSource";
import type { Repository } from "@/model/Repository";

export type RepositoryCtor<T extends object> = new (
  dataSource: DataSource,
  metadata: EntityMetadata,
  target: EntityTarget<T>,
) => Repository<T>;

class RepositoryRegistry {
  private readonly entries = new Map<EntityTarget, RepositoryCtor<object>>();

  public register<T extends object>(entity: EntityTarget<T>, ctor: RepositoryCtor<T>): void {
    if (this.entries.has(entity as EntityTarget)) {
      const existing = this.entries.get(entity as EntityTarget);
      const entityName = (entity as { name?: string }).name ?? "<anonymous>";
      const existingName = (existing as { name?: string } | undefined)?.name ?? "<anonymous>";
      const newName = (ctor as { name?: string }).name ?? "<anonymous>";
      throw new ModelError(
        "DUPLICATE_REPOSITORY",
        `Entity "${entityName}" already has a registered repository "${existingName}"; cannot register "${newName}"`,
      );
    }
    this.entries.set(entity as EntityTarget, ctor as RepositoryCtor<object>);
  }

  public get<T extends object>(entity: EntityTarget<T>): RepositoryCtor<T> | undefined {
    return this.entries.get(entity as EntityTarget) as RepositoryCtor<T> | undefined;
  }

  public clear(): void {
    this.entries.clear();
  }
}

export const repositoryRegistry = new RepositoryRegistry();
