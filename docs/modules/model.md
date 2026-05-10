# model

**Purpose.** The `model` module is the top-level entity/repository abstraction: it wraps the query-builder and drivers with typed CRUD operations, eager-loading of relations, cascade persistence, and transaction management via `AsyncLocalStorage`.

## Architecture

- **DataSource → Repository → EntityManager flow.** `DataSource` owns the driver connection and a per-entity `Repository` cache. `getRepository()` looks up decorator-registered metadata, honours any custom constructor from `repositoryRegistry`, and caches the result. `transaction()` opens a driver transaction, wraps it in an `EntityManager` (which carries its own `Repository` cache bound to the transaction driver), and stores the context in `AsyncLocalStorage` for the duration of the callback.
- **Transaction context propagation.** `transactionContext.ts` exposes a single `AsyncLocalStorage<TxContext>`. `Repository.resolveDriver()` calls `ambientTxFor(ds)` at call-time: if an ambient transaction is open for the same `DataSource`, its transactional driver is used automatically — no explicit forwarding needed.
- **BaseModel ↔ Repository duality.** `BaseModel` is an Active Record façade: every static method calls `getRepoFor(cls)`, which itself calls `ambientEntityManagerFor(ds)` so AR statics transparently participate in the current transaction. The per-class `useDataSource()` override is stored in a `WeakMap`, allowing inheritance-chain walk.
- **Hydration.** `hydrate` / `hydrateMany` create class instances via `Object.create(prototype)` and copy column values by physical-name → property-name mapping. This is the only place raw DB rows are turned into typed objects; relation loaders call it through `fetchByColumnIn`.
- **Include resolution.** `loadIncludes` dispatches per relation-kind to the four loaders in `internal/relationLoaders/`. All loaders batch-fetch in a single `WHERE col IN (...)` call for the entire parent set and assign results back onto parent objects in-memory. Nesting recurses with `depth + 1`; hard limit is `MAX_INCLUDE_DEPTH = 10`.
- **Cascade persistence.** `hasCascadeChildren` is a cheap pre-check. `buildCascadePlan` (Kahn's algorithm) traverses the entity graph following `cascade: true` relations, builds a topological order, and records `fkBackfills` (FK ← PK copy instructions to run just before each node's INSERT). `walkCascade` executes the plan, then writes M2M join-table rows via `persistRelationLinks` (batched, idempotent `ON CONFLICT DO NOTHING`).
- **Global DataSource registry.** `dataSourceRegistry` holds a single module-level reference used by `BaseModel` when no per-class override is set. `setDataSource` / `getDataSource` / `clearDataSource` control it.

## Key files & types

**Runtime core**
- `DataSource.ts:14` — `DataSource` class; state machine (new → connected → destroyed)
- `transactionContext.ts:14` — `AsyncLocalStorage<TxContext>`; `ambientTxFor`, `ambientEntityManagerFor`
- `EntityManager.ts:9` — transaction-scoped repo factory + raw SQL escape hatch
- `dataSourceRegistry.ts:4` — module-level singleton; `setDataSource` / `getDataSource` / `clearDataSource`
- `repositoryRegistry.ts:14` — `RepositoryRegistry`; maps `EntityTarget` → custom `RepositoryCtor`

**Repository & model**
- `Repository.ts:32` — `Repository<T>`; all CRUD, bulk, upsert, `loadRelation`, raw `qb()` escape
- `BaseModel.ts:57` — AR base; static query methods + instance `save()` / `delete()` / `reload()`
- `hydrate.ts:3` — `hydrate` / `hydrateMany`; prototype-based row → entity mapping
- `testing.ts:11` — `withRolledBackTransaction`; opens and intentionally aborts a transaction for test isolation

**Types**
- `types/FindArgs.ts:6` — `FindArgs<T>` / `FindOneArgs<T>` / `CountArgs<T>`; the primary query shape
- `types/Where.ts:7` — `WhereOperators<V>` ($eq / $ne / $in / $isNull / …) + `$and` / `$or` / `$not`
- `types/IncludeConfig.ts:8` — recursive `IncludeConfig<T>` keyed on `RelationKeys<T>`
- `types/Strict.ts:14` — `Strict<T, A>` narrows the return type when `narrow: true` is passed alongside `select` / `include`
- `types/Relation.ts:3` — phantom-brand `Relation<T>` distinguishing relation properties from columns

**Internal compilation**
- `internal/compileWhere.ts:178` — `compileWhere`; translates `Where<T>` into `ConditionBuilder` calls
- `internal/compileOrderBy.ts:7` — `compileOrderBy`; maps property names to `SelectQueryBuilder.orderBy`
- `internal/extractColumnValues.ts:7` — `extractColumnValues`; property → column name renaming for INSERT/UPDATE payloads
- `internal/loadIncludes.ts:9` — dispatcher; depth guard; drives `relationLoaders[relation.kind]`
- `internal/relationUtils.ts:4` — `collectKeys`, `groupByKey`, `singlePrimaryColumn`, `resolveInverseRelation`

**Relation loaders**
- `internal/relationLoaders/shared.ts:17` — `fetchByColumnIn`; single-query bulk fetch used by all loaders
- `internal/relationLoaders/loadManyToOne.ts:10` — follows FK on parent side
- `internal/relationLoaders/loadOneToMany.ts:72` — resolves inverse FK via `resolveInverseRelation`
- `internal/relationLoaders/loadOneToOne.ts:10` — delegates to `loadManyToOne` when owning-side, else inverse-FK path
- `internal/relationLoaders/loadManyToMany.ts:48` — two-step: join-table query → target fetch, optionally resolving join-table sides from the inverse relation

**Cascade**
- `internal/cascade/topoSort.ts:46` — `buildCascadePlan`; DFS graph build + Kahn topological sort + cycle detection
- `internal/cascade/walkCascade.ts:23` — `walkCascade`; applies FK backfills then persists each node in order
- `internal/cascade/persistRelationLink.ts:10` — `persistRelationLinks`; batched M2M join-table writes

**Errors**
- `errors/ModelError.ts:25` — `ModelError` with typed `ModelErrorCode` union (22 codes)

## Public exports

From `src/model/index.ts` (re-exported verbatim by `src/index.ts`):

- **Classes:** `DataSource`, `Repository`, `BaseModel`, `EntityManager`
- **Functions:** `withRolledBackTransaction`, `setDataSource`, `getDataSource`, `clearDataSource`
- **Registries:** `repositoryRegistry`
- **Errors:** `ModelError`, `ModelErrorCode`
- **Types:** `RepositoryCtor`, `Where`, `WhereOperators`, `ScalarKeys`, `OrderBy`, `SortDirection`, `FindArgs`, `FindOneArgs`, `CountArgs`, `DataSourceOptions`, `Relation`, `IncludeConfig`, `RelationTarget`, `ColumnKeys`, `RelationKeys`, `SelectMap`, `Strict`, `IncludedRelations`

## Dependencies

- `src/drivers` — `Driver` interface, `DriverFactory`, transaction protocol (`withTransaction`, `raw`, `query`)
- `src/metadata` — `defaultMetadataStorage`, `EntityMetadata`, `EntityTarget`, `RelationMetadata`
- `src/query-builder` — `QueryBuilder`, `SelectQueryBuilder`, `ConditionBuilder`, compiled query types

## Gotchas

- **Transaction context is implicit.** `Repository.resolveDriver()` checks `AsyncLocalStorage` at call-time; if you capture a repository reference before a transaction opens and use it inside the callback, it will still use the transactional driver. However, an `EntityManager`-scoped repo is bound at construction time to `this.txDriver`, so it cannot escape the transaction.
- **Cascade ordering depends on `cascade: true` + `inverseSide`.** For one-to-many and inverse one-to-one, both flags are mandatory; missing either throws `INVERSE_SIDE_NOT_FOUND` during plan construction.
- **Hydration does not call the constructor.** Instances are created with `Object.create(prototype)`, so constructor logic and field initializers are bypassed — default values set in the constructor body will not be present on hydrated entities.
- **Relation loaders use `dataSource.getDriver()` directly**, not the ambient transaction driver, so eager-loaded data is always read outside any open transaction.

## Tests

- `src/model/__tests__/`: 22 unit test files
- `src/model/__integration__/`: 40 integration test files
