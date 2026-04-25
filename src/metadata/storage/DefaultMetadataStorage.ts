import { MetadataError } from "@/metadata/errors/MetadataError";
import {
  type ColumnMetadata,
  type ColumnOptions,
  type DefaultValue,
  type EntityMetadata,
  type EntityOptions,
  type EntityTarget,
  type JoinColumnOptions,
  type JoinTableOptions,
  type MetadataStorage,
  type RelationMetadata,
  type RelationOptions,
  type ResolvedJoinColumn,
  type ResolvedJoinTable,
} from "@/metadata/types";
import type { ScalarParam } from "@/query-builder/types/common/ScalarParam";

interface EntityDraft {
  target: EntityTarget;
  registered: boolean;
  options?: EntityOptions;
  columns: Map<string, ColumnMetadata>;
  relations: Map<string, RelationMetadata>;
}

interface CacheEntry {
  version: number;
  meta: EntityMetadata;
}

export class DefaultMetadataStorage implements MetadataStorage {
  private readonly drafts = new Map<EntityTarget, EntityDraft>();
  private readonly cache = new Map<EntityTarget, CacheEntry>();
  private version = 0;

  public registerEntity(target: EntityTarget, options: EntityOptions = {}): void {
    const draft = this.getOrCreateDraft(target);
    if (draft.registered) {
      throw new MetadataError(
        "DUPLICATE_ENTITY",
        `Entity already registered: ${this.describeTarget(target)}`,
      );
    }
    draft.registered = true;
    draft.options = options;
    this.bumpVersion();
  }

  public registerColumn(
    target: EntityTarget,
    propertyName: string,
    options: ColumnOptions = {},
  ): void {
    const draft = this.getOrCreateDraft(target);
    if (draft.columns.has(propertyName)) {
      throw new MetadataError(
        "DUPLICATE_COLUMN",
        `Column already registered: ${this.describeTarget(target)}.${propertyName}`,
      );
    }
    if (draft.relations.has(propertyName)) {
      throw new MetadataError(
        "COLUMN_RELATION_CONFLICT",
        `Property already registered as relation: ${this.describeTarget(target)}.${propertyName}`,
      );
    }
    if (options.type === undefined) {
      throw new MetadataError(
        "MISSING_COLUMN_TYPE",
        `Column type is required: ${this.describeTarget(target)}.${propertyName}`,
      );
    }

    const column: ColumnMetadata = {
      target,
      propertyName,
      columnName: options.name ?? propertyName,
      type: options.type,
      dbType: options.dbType,
      nullable: options.nullable ?? false,
      isPrimary: options.primary ?? false,
      isUnique: options.unique ?? false,
      length: options.length,
      precision: options.precision,
      scale: options.scale,
      default: this.normalizeDefault(options.default),
      generated: options.generated,
      comment: options.comment,
    };
    draft.columns.set(propertyName, column);
    this.bumpVersion();
  }

  public registerRelation(
    target: EntityTarget,
    propertyName: string,
    options: RelationOptions,
  ): void {
    const draft = this.getOrCreateDraft(target);
    if (draft.relations.has(propertyName)) {
      throw new MetadataError(
        "DUPLICATE_RELATION",
        `Relation already registered: ${this.describeTarget(target)}.${propertyName}`,
      );
    }
    if (draft.columns.has(propertyName)) {
      throw new MetadataError(
        "COLUMN_RELATION_CONFLICT",
        `Property already registered as column: ${this.describeTarget(target)}.${propertyName}`,
      );
    }

    const relation: RelationMetadata = {
      target,
      propertyName,
      kind: options.kind,
      resolveTarget: options.target,
      inverseSide: options.inverseSide,
      joinColumn: this.resolveJoinColumn(propertyName, options.joinColumn),
      joinTable: this.resolveJoinTable(propertyName, options.joinTable),
      cascade: options.cascade ?? false,
      nullable: options.nullable ?? false,
    };
    draft.relations.set(propertyName, relation);
    this.bumpVersion();
  }

  public getEntity(target: EntityTarget): EntityMetadata | undefined {
    const cached = this.cache.get(target);
    if (cached && cached.version === this.version) {
      return cached.meta;
    }
    const meta = this.buildEntityMetadata(target);
    if (meta) {
      this.cache.set(target, { version: this.version, meta });
    } else {
      this.cache.delete(target);
    }
    return meta;
  }

  public hasEntity(target: EntityTarget): boolean {
    return this.getEntity(target) !== undefined;
  }

  public getEntities(): readonly EntityMetadata[] {
    const result: EntityMetadata[] = [];
    for (const draft of this.drafts.values()) {
      if (!draft.registered) continue;
      const meta = this.getEntity(draft.target);
      if (meta) result.push(meta);
    }
    return result;
  }

  public clear(): void {
    this.drafts.clear();
    this.cache.clear();
    this.version = 0;
  }

  private getOrCreateDraft(target: EntityTarget): EntityDraft {
    let draft = this.drafts.get(target);
    if (!draft) {
      draft = {
        target,
        registered: false,
        columns: new Map(),
        relations: new Map(),
      };
      this.drafts.set(target, draft);
    }
    return draft;
  }

  private bumpVersion(): void {
    this.version++;
  }

  private buildEntityMetadata(target: EntityTarget): EntityMetadata | undefined {
    const leafDraft = this.drafts.get(target);
    if (!leafDraft || !leafDraft.registered) return undefined;

    const chain = this.walkPrototypeChain(target);
    const columns = new Map<string, ColumnMetadata>();
    const relations = new Map<string, RelationMetadata>();
    for (const klass of chain) {
      const draft = this.drafts.get(klass);
      if (!draft) continue;
      for (const [propertyName, column] of draft.columns) {
        columns.set(propertyName, column);
      }
      for (const [propertyName, relation] of draft.relations) {
        relations.set(propertyName, relation);
      }
    }

    const columnList = [...columns.values()];
    const relationList = [...relations.values()];
    const className = this.describeTarget(target);

    return {
      target,
      className,
      tableName: leafDraft.options?.name ?? className,
      schema: leafDraft.options?.schema,
      columns: columnList,
      primaryColumns: columnList.filter((c) => c.isPrimary),
      relations: relationList,
      columnsByPropertyName: columns,
      relationsByPropertyName: relations,
    };
  }

  private walkPrototypeChain(target: EntityTarget): EntityTarget[] {
    const chain: EntityTarget[] = [];
    let current: unknown = target;
    while (typeof current === "function" && current !== Function.prototype) {
      chain.unshift(current as EntityTarget);
      current = Object.getPrototypeOf(current);
    }
    return chain;
  }

  private normalizeDefault(
    raw: DefaultValue | ScalarParam | undefined,
  ): DefaultValue | undefined {
    if (raw === undefined) return undefined;
    if (this.isDefaultValue(raw)) return raw;
    return { kind: "literal", value: raw };
  }

  private isDefaultValue(raw: DefaultValue | ScalarParam): raw is DefaultValue {
    return (
      typeof raw === "object" &&
      raw !== null &&
      !(raw instanceof Date) &&
      "kind" in raw
    );
  }

  private resolveJoinColumn(
    propertyName: string,
    opts: JoinColumnOptions | undefined,
  ): ResolvedJoinColumn | undefined {
    if (!opts) return undefined;
    return {
      columnName: opts.name ?? `${propertyName}Id`,
      referencedColumnName: opts.referencedColumnName ?? "id",
    };
  }

  private resolveJoinTable(
    propertyName: string,
    opts: JoinTableOptions | undefined,
  ): ResolvedJoinTable | undefined {
    if (!opts) return undefined;
    return {
      tableName: opts.name ?? `${propertyName}_join`,
      joinColumnName: opts.joinColumn?.name ?? `${propertyName}Id`,
      inverseJoinColumnName: opts.inverseJoinColumn?.name ?? `${propertyName}InverseId`,
    };
  }

  private describeTarget(target: EntityTarget): string {
    return target.name;
  }
}

export const defaultMetadataStorage: MetadataStorage = new DefaultMetadataStorage();
