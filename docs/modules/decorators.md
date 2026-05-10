# decorators

**Purpose**: Provides class and field decorators for defining entities, columns, and database relationships using TypeScript's decorator syntax.

## Key files & types

- **Entity.decorator.ts:9** – Class decorator that registers entities with `defaultMetadataStorage` and flushes pending field metadata
- **Column.decorator.ts:7** – Field decorator for declaring columns; validates against symbol-named, static, and private fields
- **PrimaryKey.decorator.ts:4** – Shorthand for `Column` with `primary: true`
- **EntityRepository.decorator.ts:4** – Class decorator that registers repository classes with `repositoryRegistry` for a given entity
- **OneToMany.decorator.ts:14** – Field decorator for one-to-many relations; accepts a lazy target function and `inverseSide` property name
- **ManyToOne.decorator.ts:20** – Field decorator for many-to-one relations; supports optional `joinColumn`, `inverseSide`, `cascade`, and `nullable`
- **OneToOne.decorator.ts:20** – Field decorator for one-to-one relations; mirrors ManyToOne options
- **ManyToMany.decorator.ts:19** – Field decorator for many-to-many relations; supports optional `joinTable`, `inverseSide`, and `cascade`

## Public exports

All decorators are exported from `src/decorators/index.ts` and re-exported at the package root:
- `Entity`, `Column`, `PrimaryKey`, `EntityRepository` (core decorators)
- `ManyToOne`, `OneToMany`, `OneToOne`, `ManyToMany` (relation decorators)
- TypeScript option interfaces: `ManyToOneOptions`, `OneToManyOptions`, `OneToOneOptions`, `ManyToManyOptions`

## Dependencies

- **metadata/storage** – Calls `defaultMetadataStorage.registerEntity()`, `registerColumn()`, `registerRelation()`
- **metadata/types** – Imports `EntityOptions`, `EntityTarget`, `ColumnOptions`, `RelationOptions`, `JoinColumnOptions`, `JoinTableOptions`
- **metadata/errors** – Throws `MetadataError` for validation failures
- **model/repositoryRegistry** – Stores repository constructors mapped to entity types

## Gotchas

- **Polyfill requirement** (symbolMetadataPolyfill.ts:6) – All decorators import the polyfill to ensure `Symbol.metadata` exists for the decorator context API; this establishes Symbol.metadata before any decorator runs
- **Pending metadata pattern** (pendingMetadata.ts) – Field decorators (`Column`, relation decorators) stash metadata in a "pending" state on `context.metadata`; only when `@Entity` finishes does `flushPendingMetadata()` commit columns and relations to storage, ensuring atomic registration
- **Lazy target in relations** – All relation decorators accept a thunk `() => TargetClass` rather than the class directly, avoiding circular dependency issues at decorator evaluation time

## Tests

4 test files in `__tests__/` (counts only, not summarized)
