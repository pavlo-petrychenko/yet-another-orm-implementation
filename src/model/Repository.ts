import { QueryBuilder } from "@/query-builder/builders/QueryBuilder";
import type { SelectQueryBuilder } from "@/query-builder/builders/SelectQueryBuilder";
import type { ColumnDescription } from "@/query-builder/types/common/ColumnDescription";
import type { TableDescription } from "@/query-builder/types/common/TableDescription";
import type { Driver } from "@/drivers/common/Driver";
import type { EntityMetadata, EntityTarget } from "@/metadata/types";
import type { DataSource } from "@/model/DataSource";
import { walkCascade, hasCascadeChildren } from "@/model/internal/cascade/walkCascade";
import { ModelError } from "@/model/errors/ModelError";
import { ambientTxFor } from "@/model/transactionContext";
import { hydrate, hydrateMany } from "@/model/hydrate";
import { compileOrderBy } from "@/model/internal/compileOrderBy";
import { compileWhere } from "@/model/internal/compileWhere";
import { extractColumnValues } from "@/model/internal/extractColumnValues";
import { loadIncludes } from "@/model/internal/loadIncludes";
import { findColumnByName } from "@/model/internal/relationUtils";
import type { CountArgs, FindArgs, FindOneArgs } from "@/model/types/FindArgs";
import type { IncludeConfig } from "@/model/types/IncludeConfig";
import type { SelectMap } from "@/model/types/SelectMap";
import type { Strict } from "@/model/types/Strict";
import type { Where } from "@/model/types/Where";
import type { OnConflictUpdate } from "@/query-builder";

type FindOneReturn<T, A> = (A extends { narrow: true } ? Strict<T, A> : T) | null;
type FindOrFailReturn<T, A> = A extends { narrow: true } ? Strict<T, A> : T;
type FindReturn<T, A> = Array<A extends { narrow: true } ? Strict<T, A> : T>;

export interface UpsertOptions<T> {
  update?: ReadonlyArray<keyof T & string> | "all-non-conflict" | "do-nothing";
}

export class Repository<T extends object> {
  protected readonly dataSource: DataSource;
  protected readonly metadata: EntityMetadata;
  protected readonly target: EntityTarget<T>;
  protected readonly qbFactory: QueryBuilder;
  /** @internal */ protected readonly txDriver?: Driver;

  public constructor(
    dataSource: DataSource,
    metadata: EntityMetadata,
    target: EntityTarget<T>,
    txDriver?: Driver,
  ) {
    this.dataSource = dataSource;
    this.metadata = metadata;
    this.target = target;
    this.qbFactory = new QueryBuilder();
    this.txDriver = txDriver;
  }

  /** @internal */
  protected resolveDriver(): Driver {
    if (this.txDriver) return this.txDriver;
    return ambientTxFor(this.dataSource) ?? this.dataSource.getDriver();
  }

  // ---------- read ----------

  public async findOne<A extends FindOneArgs<T>>(args?: A): Promise<FindOneReturn<T, A>> {
    const a: FindOneArgs<T> = args ?? {};
    const qb = this.buildSelect(a);
    if (a.where) qb.where((b) => { compileWhere(a.where as Where<T>, this.metadata, b); });
    if (a.orderBy) compileOrderBy(a.orderBy, this.metadata, qb);
    if (a.skip !== undefined) qb.offset(a.skip);
    qb.limit(1);

    const result = await this.resolveDriver().query(qb.build());
    if (result.rows.length === 0) return null as FindOneReturn<T, A>;
    const entity = hydrate(this.target, this.metadata, result.rows[0]);
    if (a.include) {
      await loadIncludes(this.dataSource, [entity], this.metadata, a.include, 0);
    }
    return entity as unknown as FindOneReturn<T, A>;
  }

  public async findOneOrFail<A extends FindOneArgs<T>>(args?: A): Promise<FindOrFailReturn<T, A>> {
    const found = await this.findOne(args);
    if (found === null) {
      throw new ModelError(
        "NOT_FOUND",
        `No ${this.metadata.className} matched the provided criteria`,
      );
    }
    return found as unknown as FindOrFailReturn<T, A>;
  }

  public async find<A extends FindArgs<T>>(args?: A): Promise<FindReturn<T, A>> {
    const a: FindArgs<T> = args ?? {};
    const qb = this.buildSelect(a);
    if (a.where) qb.where((b) => { compileWhere(a.where as Where<T>, this.metadata, b); });
    if (a.orderBy) compileOrderBy(a.orderBy, this.metadata, qb);
    if (a.take !== undefined) qb.limit(a.take);
    if (a.skip !== undefined) qb.offset(a.skip);

    const result = await this.resolveDriver().query(qb.build());
    const entities = hydrateMany(this.target, this.metadata, result.rows);
    if (a.include) {
      await loadIncludes(this.dataSource, entities, this.metadata, a.include, 0);
    }
    return entities as unknown as FindReturn<T, A>;
  }

  public async count(args: CountArgs<T> = {}): Promise<number> {
    const qb = this.qbFactory.select(this.tableDescription());
    qb.selectRaw("COUNT(*)::bigint AS count");
    if (args.where) qb.where((b) => { compileWhere(args.where as Where<T>, this.metadata, b); });

    const result = await this.resolveDriver().query<{ count: string | number }>(qb.build());
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
    if (hasCascadeChildren(data, this.metadata)) {
      return this.resolveDriver().withTransaction(async (tx) => {
        await walkCascade(data as T, this.metadata, this.dataSource, tx, "insert");
        return data as T;
      });
    }
    return this.insertWithDriver(data, this.resolveDriver());
  }

  /** @internal */
  public async insertWithDriver(data: Partial<T>, driver: Driver): Promise<T> {
    const values = extractColumnValues(data, this.metadata, { skipUndefined: true });
    const qb = this.qbFactory.insert(this.tableDescription());
    qb.values(values).returning(...this.allReturningColumns());

    const result = await driver.query(qb.build());
    return hydrate(this.target, this.metadata, result.rows[0]);
  }

  public async save(entity: T): Promise<T> {
    if (hasCascadeChildren(entity, this.metadata)) {
      return this.resolveDriver().withTransaction(async (tx) => {
        await walkCascade(entity, this.metadata, this.dataSource, tx, "save");
        return entity;
      });
    }
    return this.saveWithDriver(entity, this.resolveDriver());
  }

  /** @internal */
  public async saveWithDriver(entity: T, driver: Driver): Promise<T> {
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
        await this.updateWithDriver(pkWhere as Where<T>, patch as Partial<T>, driver);
      }

      const fresh = await this.findOneByPkWithDriver(pkWhere, driver);
      Object.assign(entity as object, fresh as object);
      return entity;
    }

    const fresh = await this.insertWithDriver(entity as Partial<T>, driver);
    Object.assign(entity as object, fresh as object);
    return entity;
  }

  public async update(where: Where<T>, patch: Partial<T>): Promise<number> {
    return this.updateWithDriver(where, patch, this.resolveDriver());
  }

  /** @internal */
  public async updateWithDriver(
    where: Where<T>,
    patch: Partial<T>,
    driver: Driver,
  ): Promise<number> {
    const values = extractColumnValues(patch, this.metadata, { skipUndefined: true });
    if (Object.keys(values).length === 0) {
      throw new ModelError("EMPTY_UPDATE", "update() patch contains no recognized column values");
    }

    const qb = this.qbFactory.update(this.tableDescription());
    qb.set(values);
    qb.where((b) => { compileWhere(where, this.metadata, b); });

    const result = await driver.query(qb.build());
    return result.rowCount;
  }

  public async delete(where: Where<T>): Promise<number> {
    const qb = this.qbFactory.delete(this.tableDescription());
    qb.where((b) => { compileWhere(where, this.metadata, b); });

    const result = await this.resolveDriver().query(qb.build());
    return result.rowCount;
  }

  public deleteMany(where: Where<T>): Promise<number> {
    return this.delete(where);
  }

  // ---------- bulk ----------

  public async insertMany(rows: ReadonlyArray<Partial<T>>): Promise<T[]> {
    if (rows.length === 0) {
      throw new ModelError("EMPTY_BULK", "insertMany() requires at least one row");
    }

    const propNames = new Set<string>();
    for (const row of rows) {
      for (const propName of Object.keys(row as object)) {
        if (this.metadata.columnsByPropertyName.has(propName)) {
          propNames.add(propName);
        }
      }
    }
    if (propNames.size === 0) {
      throw new ModelError(
        "EMPTY_UPDATE",
        "insertMany() received rows with no recognized column values",
      );
    }

    const padded: Record<string, unknown>[] = rows.map((row) => {
      const out: Record<string, unknown> = {};
      const record = row as Record<string, unknown>;
      for (const propName of propNames) {
        const col = this.metadata.columnsByPropertyName.get(propName);
        if (!col) continue;
        out[col.columnName] = record[propName];
      }
      return out;
    });

    const qb = this.qbFactory.insert(this.tableDescription());
    qb.valuesList(padded).returning(...this.allReturningColumns());

    const result = await this.resolveDriver().query(qb.build());
    return hydrateMany(this.target, this.metadata, result.rows);
  }

  public async saveMany(entities: ReadonlyArray<T>): Promise<T[]> {
    if (entities.length === 0) {
      throw new ModelError("EMPTY_BULK", "saveMany() requires at least one entity");
    }
    return this.resolveDriver().withTransaction(async (tx) => {
      for (const entity of entities) {
        if (hasCascadeChildren(entity, this.metadata)) {
          await walkCascade(entity, this.metadata, this.dataSource, tx, "save");
        } else {
          await this.saveWithDriver(entity, tx);
        }
      }
      return entities as T[];
    });
  }

  public async upsert(
    data: Partial<T>,
    conflictKeys: ReadonlyArray<keyof T & string>,
    options: UpsertOptions<T> = {},
  ): Promise<T> {
    if (conflictKeys.length === 0) {
      throw new ModelError("MISSING_CONFLICT_KEYS", "upsert() requires at least one conflictKey");
    }
    const record = data as Record<string, unknown>;
    for (const k of conflictKeys) {
      if (record[k] === undefined) {
        throw new ModelError(
          "MISSING_CONFLICT_KEYS",
          `upsert(): conflict key '${k}' must be present in data`,
        );
      }
    }
    const values = extractColumnValues(data, this.metadata, { skipUndefined: true });
    if (Object.keys(values).length === 0) {
      throw new ModelError(
        "EMPTY_UPDATE",
        "upsert() received data with no recognized column values",
      );
    }

    const targetColumns = conflictKeys.map((k) => this.requireColumnName(k));
    const updateColumns = this.resolveUpsertUpdate(
      options.update ?? "all-non-conflict",
      conflictKeys,
    );

    const qb = this.qbFactory.insert(this.tableDescription());
    qb.values(values)
      .returning(...this.allReturningColumns())
      .onConflict({ targetColumns, updateColumns });

    const result = await this.resolveDriver().query(qb.build());
    if (result.rows.length === 0) {
      // updateColumns resolved to "do-nothing" and a conflict occurred → DB returned no row.
      // Re-query by conflict keys to give the caller the persisted row.
      const where: Record<string, unknown> = {};
      for (const k of conflictKeys) where[k] = record[k];
      const found = await this.findOne({ where: where as Where<T> });
      if (found === null) {
        throw new ModelError(
          "NOT_FOUND",
          `upsert(): no row returned and no row matched the conflict keys`,
        );
      }
      return found as T;
    }
    return hydrate(this.target, this.metadata, result.rows[0]);
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
    const result = await this.resolveDriver().raw(sql, params);
    return result.rows as TRow[];
  }

  public qb(alias?: string): SelectQueryBuilder {
    return this.qbFactory.select(this.tableDescription(alias));
  }

  // ---------- internals ----------

  private async findOneByPkWithDriver(
    pkWhere: Record<string, unknown>,
    driver: Driver,
  ): Promise<T> {
    const qb = this.buildSelect();
    qb.where((b) => { compileWhere(pkWhere as Where<T>, this.metadata, b); });
    qb.limit(1);
    const result = await driver.query(qb.build());
    if (result.rows.length === 0) {
      throw new ModelError(
        "NOT_FOUND",
        `No ${this.metadata.className} matched the provided primary key`,
      );
    }
    return hydrate(this.target, this.metadata, result.rows[0]);
  }

  private requireColumnName(propertyName: string): string {
    const col = this.metadata.columnsByPropertyName.get(propertyName);
    if (!col) {
      throw new ModelError(
        "UNKNOWN_COLUMN",
        `${this.metadata.className} has no column with property name '${propertyName}'`,
      );
    }
    return col.columnName;
  }

  private resolveUpsertUpdate(
    update: ReadonlyArray<keyof T & string> | "all-non-conflict" | "do-nothing",
    conflictKeys: ReadonlyArray<keyof T & string>,
  ): OnConflictUpdate {
    if (update === "all-non-conflict" || update === "do-nothing") return update;
    const conflictColumnNames = new Set(conflictKeys.map((k) => this.requireColumnName(k)));
    const cols: string[] = [];
    for (const k of update) {
      const colName = this.requireColumnName(k);
      if (conflictColumnNames.has(colName)) continue;
      cols.push(colName);
    }
    return cols;
  }

  private tableDescription(alias?: string): TableDescription {
    return alias === undefined
      ? { name: this.metadata.tableName }
      : { name: this.metadata.tableName, alias };
  }

  private buildSelect(args?: { select?: SelectMap<T>; include?: IncludeConfig<T> }): SelectQueryBuilder {
    const qb = this.qbFactory.select(this.tableDescription());
    qb.select(...this.selectedColumns(args));
    return qb;
  }

  private selectedColumns(
    args?: { select?: SelectMap<T>; include?: IncludeConfig<T> },
  ): ColumnDescription[] {
    if (!args?.select) {
      return this.metadata.columns.map((col) => this.columnDesc(col.columnName));
    }

    const wanted = new Set<string>();
    const selectRecord = args.select as Record<string, unknown>;
    for (const key of Object.keys(selectRecord)) {
      if (selectRecord[key] === true) wanted.add(key);
    }
    for (const pk of this.metadata.primaryColumns) wanted.add(pk.propertyName);

    if (args.include) {
      const includeRecord = args.include as Record<string, unknown>;
      for (const includeKey of Object.keys(includeRecord)) {
        const node = includeRecord[includeKey];
        if (node === undefined || node === false) continue;
        const rel = this.metadata.relationsByPropertyName.get(includeKey);
        if (!rel?.joinColumn) continue;
        const fkProp = findColumnByName(this.metadata, rel.joinColumn.columnName).propertyName;
        wanted.add(fkProp);
      }
    }

    return this.metadata.columns
      .filter((col) => wanted.has(col.propertyName))
      .map((col) => this.columnDesc(col.columnName));
  }

  private columnDesc(columnName: string): ColumnDescription {
    return { name: columnName, table: this.metadata.tableName };
  }

  private allReturningColumns(): ColumnDescription[] {
    return this.metadata.columns.map((col) => ({ name: col.columnName }));
  }
}
