# metadata

**Purpose**

Defines the entity/column/relation metadata system that decorators populate and the ORM core consumes. Provides a global singleton storage for reflecting entity structure and generating SQL schema and queries.

**Key files & types**

- **MetadataStorage interface** (`types/MetadataStorage.ts:5`) — contract for registration and retrieval: `registerEntity()`, `registerColumn()`, `registerRelation()`, `getEntity()`, `hasEntity()`, `getEntities()`, `clear()`.
- **EntityMetadata** (`types/EntityMetadata.ts:11`) — holds entity class target, table name, schema, and readonly maps of columns/relations by property name. Automatically filters primary columns.
- **ColumnMetadata** (`types/ColumnMetadata.ts:40`) — describes column type, nullability, uniqueness, defaults, and generated strategy. Resolves column name from options or property name.
- **RelationMetadata** (`types/RelationMetadata.ts:39`) — tracks relation kind, target resolver (lazy), join columns, join tables, cascading, and inverse-side references.
- **DefaultMetadataStorage** (`storage/DefaultMetadataStorage.ts:32`) — singleton implementation using internal drafts map. Validates uniqueness (no duplicate entity/column/relation on same target). Builds EntityMetadata on demand via prototype chain walk. Version-based cache invalidation after each registration.

**Public exports**

`defaultMetadataStorage` instance, types (`EntityMetadata`, `ColumnMetadata`, `RelationMetadata`, `MetadataStorage`), and `MetadataError`.

**Dependencies**

- `@/decorators` — calls registration methods
- `@/model` — reads entities/columns/relations via `getEntity()`
- `@/query-builder/types` — ColumnType, DefaultValue use ScalarParam

**Gotchas**

- **Global singleton**: `defaultMetadataStorage` is a mutable global—tests must call `clear()` between runs or registration will fail with DUPLICATE_* errors.
- **Lazy target resolution**: `RelationMetadata.resolveTarget` is a function, not the target itself; called at build time to allow circular entity references.
- **Prototype chain inheritance**: `EntityMetadata` merges columns/relations from the full prototype chain (parent classes), so base-model fields appear in children.

**Tests**

1 test file covering registration, caching, and metadata building.
