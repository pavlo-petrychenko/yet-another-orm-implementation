# Model Layer — Iteration Roadmap

A high-level, atomic-iteration plan for the model/repository layer. Companion to `MODEL_ARCHITECTURE.md` (which records the design decisions this roadmap implements).

**Atomicity contract for every iteration:**

- Strictly defined prerequisites, scope, exposed API, and testing strategy.
- Ships with prod-quality code — no `TODO`s, no "simplified for now", no half-implementations.
- Ends with all tests green, type-checking and lint clean.
- Anything not in the iteration's scope is genuinely not in the codebase, not a stub.

---

## Iteration 1 — Flat-entity persistence

**Prerequisites:** existing modules (`metadata`, `decorators`, `query-builder`, pg driver).

**Scope:** complete CRUD for entities without relations. Connection lifecycle, repository engine, AR sugar, custom-repository extensibility — all production-quality for the flat-entity slice. Relations declared on entities are simply ignored by this iteration's CRUD methods (the FK columns are still written/read; the relation properties are not populated).

**Exposed API:**

```ts
// connection
class DataSource {
  constructor(opts: DataSourceOptions);
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getRepository<T>(entity: EntityTarget<T>, custom?: typeof Repository): Repository<T>;
}
function setDataSource(ds: DataSource): void;
function getDataSource(): DataSource;
function clearDataSource(): void;            // test-time

// repository
class Repository<T> {
  findOne(args: FindOneArgs<T>): Promise<T | null>;
  findOneOrFail(args: FindOneArgs<T>): Promise<T>;
  find(args?: FindArgs<T>): Promise<T[]>;
  count(args?: CountArgs<T>): Promise<number>;
  exists(where: Where<T>): Promise<boolean>;

  create(data: Partial<T>): T;                  // build only, no SQL
  insert(data: Partial<T>): Promise<T>;
  save(entity: T): Promise<T>;                  // smart: insert-or-update by PK presence
  update(where: Where<T>, patch: Partial<T>): Promise<number>;
  delete(where: Where<T>): Promise<number>;

  query(sql: string, params?: unknown[]): Promise<unknown>;
  qb(alias?: string): QueryBuilder<T>;          // escape hatch
}

// active record
class BaseModel {
  static findOne, findOneOrFail, find, count, exists, create, insert;
  save(): Promise<this>;
  delete(): Promise<void>;
  reload(): Promise<this>;
  static useDataSource(ds: DataSource): void;
}

// option types
type Where<T>;        // equality + operators ($eq, $ne, $gt, $lt, $gte, $lte, $in, $like, $isNull) + AND / OR / NOT
type OrderBy<T>;      // { col: 'asc' | 'desc' }[]
type FindArgs<T>     = { where?: Where<T>; orderBy?: OrderBy<T>; take?: number; skip?: number };
type FindOneArgs<T>  = FindArgs<T>;
type CountArgs<T>    = { where?: Where<T> };
```

**Testing strategy:**

- **Unit:** `Where` compilation per operator; hydration via `Object.create + assign` (verify user constructor never runs); `DataSource` singleton + override; `save()` PK-presence branching.
- **Integration** (real pg via existing driver, schema bootstrapped per suite): full CRUD round-trip; concurrent `findOne` calls return distinct objects; custom `Repository<User>` subclass picked up by `getRepository`.
- **Parity:** every Repository test is re-run through the BaseModel AR API to guarantee 1:1 behavior.
- **Cleanup:** every test resets the dataSource and truncates tables.

**Definition of done:** new flat entity → decorate → register `DataSource` → call any CRUD method → SQL emitted → result hydrated → custom repository subclassing works.

---

## Iteration 2 — Relation loading (read side, runtime)

**Prerequisites:** iter 1.

**Scope:** runtime `include` for the four relation kinds (ManyToOne, OneToMany, OneToOne, ManyToMany). Default-reading types — `User` still includes `orders!: Relation<Order[]>` as-declared; the *runtime* honors `include` and populates the property. The `Relation<T>` brand is introduced **as a runtime-no-op type wrapper** here so users start writing entities the right way; full type narrowing comes in iter 3.

**Loading strategy:** per-relation batched IN queries (no JOINs in this iter — keeps SQL predictable, eliminates duplicate-row hydration). Recursive includes resolved level-by-level. Cycle/depth limit enforced.

**Exposed API additions:**

```ts
type Relation<T> = T;                         // identity now; brand added in iter 3

type IncludeConfig<T> = {
  [K in keyof T]?:
    | true
    | { include?: IncludeConfig<RelationTarget<T[K]>> };
};

// FindArgs / FindOneArgs gain `include?: IncludeConfig<T>`

Repository<T>.loadRelation<K extends keyof T>(
  entity: T,
  relation: K,
): Promise<T[K]>;                             // explicit on-demand load
```

**Testing strategy:**

- **Unit:** `IncludeConfig` parsing; relation-fetch SQL shape per kind; cycle-depth limit.
- **Integration:** parent + many children hydrated correctly; many-to-many through join table; nested `include` (`{ orders: { include: { items: true } } }`); empty result sets.
- **N+1 audit:** assert exactly one query per relation level via driver query log.
- **Negative:** `include` of an unknown property fails at runtime with a clear error.
- **AR parity:** `User.find({ include: { orders: true } })` matches Repository result.

**Definition of done:** any combination of include configs (single, array, nested, multiple-siblings) returns a fully populated tree; query count is bounded by relation-tree depth × tree fanout, never per-row.

---

## Iteration 3 — Type narrowing (`narrow: true`)

**Prerequisites:** iter 2.

**Scope:** type-system iteration. Adds the `narrow: true` opt-in that switches return types from "as-declared" to "as-loaded" via the `Strict<T, A>` computed type. Promotes `Relation<T>` to a real brand. Adds `select` (typed projection) — runtime now honors it for column-list pruning (`SELECT a, b` instead of `SELECT *`); type effect is gated by `narrow`.

**Exposed API additions:**

```ts
// brand (replaces the iter-2 identity alias)
type Relation<T> = T & { readonly __relation__?: never };

// type machinery
type ColumnKeys<T>;
type RelationKeys<T>;
type SelectMap<T> = { [K in ColumnKeys<T>]?: true };
type Strict<T, A>;

// FindArgs / FindOneArgs gain `select?: SelectMap<T>` and `narrow?: true`

// every read method becomes generic + conditional return:
findOne<A extends FindOneArgs<T>>(args: A):
  Promise<(A extends { narrow: true } ? Strict<T, A> : T) | null>;
// (same shape on find, findOneOrFail)
```

**Testing strategy:**

- **Type tests** (tsd / `expectTypeOf`): the worked examples from `MODEL_ARCHITECTURE.md` §4 each get a type assertion (no-narrow → `T`; narrow + include → strict shape; narrow + select → picked columns; narrow + select + include → both).
- **Type tests negative:** passing a non-existent column to `select` errors; passing a column key to `include` errors; nested `include` on a scalar errors.
- **Runtime equivalence:** with and without `narrow`, the *executed SQL* is byte-identical given the same `select` + `include` (proves `narrow` is type-only).
- **Runtime:** `select` without `narrow` still prunes columns at the SQL level; missing columns are `undefined` on returned instances.
- **Backward-compat:** every iter-1 + iter-2 test passes unchanged. `Relation<T>` brand is invisible at runtime.

**Definition of done:** users can opt into Prisma-grade typed results by adding `narrow: true`, and the `Strict<T, A>` shape exactly matches what was actually loaded — no more, no less.

---

## Iteration 4 — Cascade writes & batched mutations

**Prerequisites:** iter 1, iter 2.

**Scope:** the write-side counterpart to iter 2. Saving / inserting an entity tree with `cascade: true` relations persists children in FK-correct order. Bulk operations are first-class. Upsert by conflict keys.

**Exposed API additions:**

```ts
Repository<T>.upsert(
  data: Partial<T>,
  conflictKeys: ReadonlyArray<keyof T>,
): Promise<T>;

Repository<T>.insertMany(rows: Partial<T>[]): Promise<T[]>;
Repository<T>.saveMany(entities: T[]): Promise<T[]>;
Repository<T>.deleteMany(where: Where<T>): Promise<number>;

// cascade behavior — controlled by RelationOptions.cascade on the entity
// repo.save(parent) walks the tree, ordering INSERTs to satisfy FKs.
```

**Testing strategy:**

- **Integration:** `save(user)` with `cascade: true` on `orders` writes parent + children; FK ordering correct.
- **Cascade depth:** nested cascades (`User → Order → OrderItem`) ship in one transaction-bracket.
- **Upsert:** PG `ON CONFLICT` SQL emitted; both insert-path and update-path verified.
- **Bulk:** `insertMany` of N rows issues exactly one `INSERT ... VALUES (...), (...)` (not N inserts).
- **Cycles:** cascade with circular relations is detected and either rejected or insert-then-update; documented behavior tested.
- **AR parity:** `user.save()` cascades the same way `repo.save(user)` does.

**Definition of done:** persisting an entity graph is one method call; bulk inserts of N rows is one SQL round trip; upsert matches Postgres conflict semantics exactly.

---

## Iteration 5 — Transactions

**Prerequisites:** iter 1, iter 2, iter 4.

**Scope:** explicit transaction lifecycle plus ambient propagation so existing repository methods participate without API changes. `AsyncLocalStorage` carries the active transaction; absent a transaction, repos run on the connection as before. Nested transactions degrade to savepoints.

**Exposed API additions:**

```ts
class DataSource {
  transaction<R>(fn: (em: EntityManager) => Promise<R>): Promise<R>;
}

class EntityManager {
  getRepository<T>(entity: EntityTarget<T>): Repository<T>;
  // same Repository surface, scoped to the transaction
}

// AR also picks up ambient transaction:
//   await dataSource.transaction(async () => {
//     await user.save();    // uses tx automatically via AsyncLocalStorage
//   });
```

**Testing strategy:**

- **Integration:** commit on success; rollback on throw; nested transactions use savepoints.
- **Ambient propagation:** `BaseModel.save` inside a transaction callback sees the tx without being passed it.
- **Isolation:** transaction-rollback strategy adopted as the default test cleanup mechanism (replaces truncation).
- **Concurrency:** two parallel transactions on different async contexts don't see each other's uncommitted state.
- **Read-after-write** within a transaction returns the uncommitted state.

**Definition of done:** every repository method works identically inside and outside a transaction; rolling back actually un-does all writes; nested transactions degrade to savepoints, not no-ops.

---

## Dependency graph

```
iter 1 ── iter 2 ── iter 3
                 \
                  ── iter 4 ── iter 5
```

- **iter 1 → 2 → 3** is a strict chain (each strictly extends the previous).
- **iter 4** depends on 1 & 2; orthogonal to 3. Could ship before 3 if priorities flip.
- **iter 5** depends on 1, 2, and 4.

## Notes on ordering

The roadmap places **type narrowing (iter 3)** before **cascade writes (iter 4)**. Rationale: narrowing is the smallest user-visible unit shippable after relations exist, and lets the type story mature end-to-end before more runtime piles up. The opposite ordering (cascade → narrowing) ships more runtime power per iteration. Either works; pick by which axis (types vs runtime) you want to mature first.

## Out of scope for this roadmap

Documented in `MODEL_ARCHITECTURE.md` §7. Notable items intentionally absent from all five iterations: identity map / change tracking, lazy proxies, lifecycle hook decorators, schema migrations, polymorphic / single-table inheritance, `AsyncLocalStorage`-scoped data sources beyond the transaction case.
