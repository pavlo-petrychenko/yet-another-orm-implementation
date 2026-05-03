import type { EntityMetadata, EntityTarget } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { getDataSource } from "@/model/dataSourceRegistry";
import { ModelError } from "@/model/errors/ModelError";
import type { Repository } from "@/model/Repository";
import { ambientEntityManagerFor } from "@/model/transactionContext";
import type { CountArgs, FindArgs, FindOneArgs } from "@/model/types/FindArgs";
import type { Strict } from "@/model/types/Strict";
import type { Where } from "@/model/types/Where";
import type { UpsertOptions } from "@/model/Repository";

type AnyClassRef = abstract new (...args: any[]) => unknown;

const overrides = new WeakMap<AnyClassRef, DataSource>();

const FUNCTION_PROTO = Function.prototype as object;

function resolveDataSource(cls: AnyClassRef): DataSource {
  let cursor: AnyClassRef | null = cls;
  while (cursor) {
    const ds = overrides.get(cursor);
    if (ds) return ds;
    const proto = Object.getPrototypeOf(cursor) as AnyClassRef | null;
    cursor = proto && (proto as unknown as object) !== FUNCTION_PROTO ? proto : null;
  }
  return getDataSource();
}

function getRepoFor<T extends object>(cls: EntityTarget<T>): Repository<T> {
  const ds = resolveDataSource(cls as unknown as AnyClassRef);
  const ambient = ambientEntityManagerFor(ds);
  return ambient ? ambient.getRepository(cls) : ds.getRepository(cls);
}

function pkWhereOf<T extends object>(instance: T, metadata: EntityMetadata): Where<T> {
  if (metadata.primaryColumns.length === 0) {
    throw new ModelError(
      "NO_PRIMARY_KEY",
      `Entity ${metadata.className} has no primary key declared`,
    );
  }
  const where: Record<string, unknown> = {};
  const record = instance as unknown as Record<string, unknown>;
  for (const col of metadata.primaryColumns) {
    const value = record[col.propertyName];
    if (value === undefined || value === null) {
      throw new ModelError(
        "NO_PRIMARY_KEY",
        `Entity ${metadata.className} instance is missing primary key value for "${col.propertyName}"`,
      );
    }
    where[col.propertyName] = value;
  }
  return where as Where<T>;
}

export abstract class BaseModel {
  public static useDataSource<This extends typeof BaseModel>(this: This, ds: DataSource): void {
    overrides.set(this, ds);
  }

  public static findOne<
    This extends typeof BaseModel,
    A extends FindOneArgs<InstanceType<This>>,
  >(
    this: This,
    args?: A,
  ): Promise<(A extends { narrow: true } ? Strict<InstanceType<This>, A> : InstanceType<This>) | null> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).findOne(args);
  }

  public static findOneOrFail<
    This extends typeof BaseModel,
    A extends FindOneArgs<InstanceType<This>>,
  >(
    this: This,
    args?: A,
  ): Promise<A extends { narrow: true } ? Strict<InstanceType<This>, A> : InstanceType<This>> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).findOneOrFail(args);
  }

  public static find<
    This extends typeof BaseModel,
    A extends FindArgs<InstanceType<This>>,
  >(
    this: This,
    args?: A,
  ): Promise<Array<A extends { narrow: true } ? Strict<InstanceType<This>, A> : InstanceType<This>>> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).find(args);
  }

  public static count<This extends typeof BaseModel>(
    this: This,
    args?: CountArgs<InstanceType<This>>,
  ): Promise<number> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).count(args);
  }

  public static exists<This extends typeof BaseModel>(
    this: This,
    where: Where<InstanceType<This>>,
  ): Promise<boolean> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).exists(where);
  }

  public static create<This extends typeof BaseModel>(
    this: This,
    data: Partial<InstanceType<This>>,
  ): InstanceType<This> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).create(data);
  }

  public static insert<This extends typeof BaseModel>(
    this: This,
    data: Partial<InstanceType<This>>,
  ): Promise<InstanceType<This>> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).insert(data);
  }

  public static insertMany<This extends typeof BaseModel>(
    this: This,
    rows: ReadonlyArray<Partial<InstanceType<This>>>,
  ): Promise<InstanceType<This>[]> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).insertMany(rows);
  }

  public static saveMany<This extends typeof BaseModel>(
    this: This,
    entities: ReadonlyArray<InstanceType<This>>,
  ): Promise<InstanceType<This>[]> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).saveMany(entities);
  }

  public static deleteMany<This extends typeof BaseModel>(
    this: This,
    where: Where<InstanceType<This>>,
  ): Promise<number> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).deleteMany(where);
  }

  public static upsert<This extends typeof BaseModel>(
    this: This,
    data: Partial<InstanceType<This>>,
    conflictKeys: ReadonlyArray<keyof InstanceType<This> & string>,
    options?: UpsertOptions<InstanceType<This>>,
  ): Promise<InstanceType<This>> {
    return getRepoFor(this as unknown as EntityTarget<InstanceType<This>>).upsert(data, conflictKeys, options);
  }

  public async save(): Promise<this> {
    const ctor = this.constructor as unknown as EntityTarget<this>;
    const repo = getRepoFor(ctor);
    await repo.save(this);
    return this;
  }

  public async delete(): Promise<void> {
    const ctor = this.constructor as unknown as EntityTarget<this>;
    const ds = resolveDataSource(ctor);
    const metadata = ds.getMetadata(ctor);
    const where = pkWhereOf(this, metadata);
    await getRepoFor(ctor).delete(where);
  }

  public async loadRelation<K extends keyof this>(relation: K): Promise<this[K]> {
    const ctor = this.constructor as unknown as EntityTarget<this>;
    const repo = getRepoFor(ctor);
    return repo.loadRelation(this, relation);
  }

  public async reload(): Promise<this> {
    const ctor = this.constructor as unknown as EntityTarget<this>;
    const ds = resolveDataSource(ctor);
    const metadata = ds.getMetadata(ctor);
    const where = pkWhereOf(this, metadata);
    const fresh = await getRepoFor(ctor).findOneOrFail({ where });
    Object.assign(this as object, fresh as object);
    return this;
  }
}
