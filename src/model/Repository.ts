import { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
import type { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import type { TableDescription } from "@/query-builder/types/common/TableDescription";
import type { EntityMetadata, EntityTarget } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { ModelError } from "@/model/errors/ModelError";
import { hydrate, hydrateMany } from "@/model/hydrate";
import { compileOrderBy } from "@/model/internal/compileOrderBy";
import { compileWhere } from "@/model/internal/compileWhere";
import { extractColumnValues } from "@/model/internal/extractColumnValues";
import { loadIncludes } from "@/model/internal/loadIncludes";
import type { CountArgs, FindArgs, FindOneArgs } from "@/model/types/FindArgs";
import type { IncludeConfig } from "@/model/types/IncludeConfig";
import type { Where } from "@/model/types/Where";

export class Repository<T extends object> {
  protected readonly dataSource: DataSource;
  protected readonly metadata: EntityMetadata;
  protected readonly target: EntityTarget<T>;
  protected readonly qbFactory: QueryBuilder;

  public constructor(dataSource: DataSource, metadata: EntityMetadata, target: EntityTarget<T>) {
    this.dataSource = dataSource;
    this.metadata = metadata;
    this.target = target;
    this.qbFactory = new QueryBuilder();
  }

  // ---------- read ----------

  public async findOne(args: FindOneArgs<T> = {}): Promise<T | null> {
    const qb = this.buildSelect();
    if (args.where) qb.where((b) => { compileWhere(args.where as Where<T>, this.metadata, b); });
    if (args.orderBy) compileOrderBy(args.orderBy, this.metadata, qb);
    if (args.skip !== undefined) qb.offset(args.skip);
    qb.limit(1);

    const result = await this.dataSource.getDriver().query(qb.build());
    if (result.rows.length === 0) return null;
    const entity = hydrate(this.target, this.metadata, result.rows[0]);
    if (args.include) {
      await loadIncludes(this.dataSource, [entity], this.metadata, args.include, 0);
    }
    return entity;
  }

  public async findOneOrFail(args: FindOneArgs<T> = {}): Promise<T> {
    const found = await this.findOne(args);
    if (found === null) {
      throw new ModelError(
        "NOT_FOUND",
        `No ${this.metadata.className} matched the provided criteria`,
      );
    }
    return found;
  }

  public async find(args: FindArgs<T> = {}): Promise<T[]> {
    const qb = this.buildSelect();
    if (args.where) qb.where((b) => { compileWhere(args.where as Where<T>, this.metadata, b); });
    if (args.orderBy) compileOrderBy(args.orderBy, this.metadata, qb);
    if (args.take !== undefined) qb.limit(args.take);
    if (args.skip !== undefined) qb.offset(args.skip);

    const result = await this.dataSource.getDriver().query(qb.build());
    const entities = hydrateMany(this.target, this.metadata, result.rows);
    if (args.include) {
      await loadIncludes(this.dataSource, entities, this.metadata, args.include, 0);
    }
    return entities;
  }

  public async count(args: CountArgs<T> = {}): Promise<number> {
    const qb = this.qbFactory.select(this.tableDescription());
    qb.selectRaw("COUNT(*)::bigint AS count");
    if (args.where) qb.where((b) => { compileWhere(args.where as Where<T>, this.metadata, b); });

    const result = await this.dataSource.getDriver().query<{ count: string | number }>(qb.build());
    if (result.rows.length === 0) return 0;
    return Number(result.rows[0].count);
  }

  public async exists(where: Where<T>): Promise<boolean> {
    const found = await this.findOne({ where });
    return found !== null;
  }

  // ---------- write ----------

  public create(data: Partial<T>): T {
    const prototype = (this.target as { prototype: object }).prototype;
    const instance = Object.create(prototype) as Partial<T>;
    Object.assign(instance, data);
    return instance as T;
  }

  public async insert(data: Partial<T>): Promise<T> {
    const values = extractColumnValues(data, this.metadata, { skipUndefined: true });
    const qb = this.qbFactory.insert(this.tableDescription());
    qb.values(values).returning(...this.allReturningColumns());

    const result = await this.dataSource.getDriver().query(qb.build());
    return hydrate(this.target, this.metadata, result.rows[0]);
  }

  public async save(entity: T): Promise<T> {
    const pkColumns = this.metadata.primaryColumns;
    if (pkColumns.length === 0) {
      throw new ModelError(
        "NO_PRIMARY_KEY",
        `Entity ${this.metadata.className} has no primary key declared`,
      );
    }

    const record = entity as unknown as Record<string, unknown>;
    const hasAllPks = pkColumns.every((col) => {
      const value = record[col.propertyName];
      return value !== undefined && value !== null;
    });

    if (hasAllPks) {
      const pkWhere: Record<string, unknown> = {};
      for (const col of pkColumns) {
        pkWhere[col.propertyName] = record[col.propertyName];
      }

      const patch: Record<string, unknown> = {};
      for (const col of this.metadata.columns) {
        if (col.isPrimary) continue;
        if (Object.prototype.hasOwnProperty.call(record, col.propertyName)) {
          const value = record[col.propertyName];
          if (value !== undefined) {
            patch[col.propertyName] = value;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await this.update(pkWhere as Where<T>, patch as Partial<T>);
      }

      const fresh = await this.findOneOrFail({ where: pkWhere as Where<T> });
      Object.assign(entity as object, fresh as object);
      return entity;
    }

    const fresh = await this.insert(entity as Partial<T>);
    Object.assign(entity as object, fresh as object);
    return entity;
  }

  public async update(where: Where<T>, patch: Partial<T>): Promise<number> {
    const values = extractColumnValues(patch, this.metadata, { skipUndefined: true });
    if (Object.keys(values).length === 0) {
      throw new ModelError("EMPTY_UPDATE", "update() patch contains no recognized column values");
    }

    const qb = this.qbFactory.update(this.tableDescription());
    qb.set(values);
    qb.where((b) => { compileWhere(where, this.metadata, b); });

    const result = await this.dataSource.getDriver().query(qb.build());
    return result.rowCount;
  }

  public async delete(where: Where<T>): Promise<number> {
    const qb = this.qbFactory.delete(this.tableDescription());
    qb.where((b) => { compileWhere(where, this.metadata, b); });

    const result = await this.dataSource.getDriver().query(qb.build());
    return result.rowCount;
  }

  // ---------- relations ----------

  public async loadRelation<K extends keyof T>(entity: T, relation: K): Promise<T[K]> {
    const propertyName = relation as string;
    if (!this.metadata.relationsByPropertyName.has(propertyName)) {
      throw new ModelError(
        "UNKNOWN_RELATION",
        `${this.metadata.className}.${propertyName} is not a registered relation`,
      );
    }
    const include = { [propertyName]: true } as IncludeConfig<T>;
    await loadIncludes(this.dataSource, [entity], this.metadata, include, 0);
    return entity[relation];
  }

  // ---------- escape ----------

  public async query<TRow = unknown>(sql: string, params: readonly unknown[] = []): Promise<TRow[]> {
    const result = await this.dataSource.getDriver().raw(sql, params);
    return result.rows as TRow[];
  }

  public qb(alias?: string): SelectQueryBuilder {
    return this.qbFactory.select(this.tableDescription(alias));
  }

  // ---------- internals ----------

  private tableDescription(alias?: string): TableDescription {
    return alias === undefined
      ? { name: this.metadata.tableName }
      : { name: this.metadata.tableName, alias };
  }

  private buildSelect(): SelectQueryBuilder {
    const qb = this.qbFactory.select(this.tableDescription());
    qb.select(...this.allColumns());
    return qb;
  }

  private allColumns(): ColumnDescription[] {
    return this.metadata.columns.map((col) => ({
      name: col.columnName,
      table: this.metadata.tableName,
    }));
  }

  private allReturningColumns(): ColumnDescription[] {
    return this.metadata.columns.map((col) => ({ name: col.columnName }));
  }
}
