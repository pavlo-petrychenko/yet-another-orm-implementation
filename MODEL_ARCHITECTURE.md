# Model Layer — Architectural Decisions

A summary of decisions made during design discussion. Not a plan; not an implementation guide. The decisions below define the v1 surface of the model/repository layer that sits on top of the existing `metadata`, `decorators`, and `query-builder` modules.

---

## 1. Overall pattern: Dual Active Record + Repository

**Repository is the real engine. Active Record is sugar over it.**

Three layers, bottom-up:

- **Layer 1 — QueryBuilder + Driver** (already exists). Builds SQL, drivers execute.
- **Layer 2 — `Repository<TEntity>`**. The engine. Owns query execution, hydration, relation loading. Holds a reference to the driver and the entity's metadata. **Stateless per call** (no per-instance change tracking, no identity map).
- **Layer 3 — `BaseModel`**. Static + instance methods that delegate to a repository looked up via metadata + a global connection singleton. Zero logic of its own.

**Direction of dependency is one-way only**: BaseModel → Repository. The ORM internals never reach up into AR. Tests, advanced users, and DI plug in cleanly at Layer 2.

---

## 2. The eight design decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Connection lookup | **Global singleton + override.** Module-level `getDataSource()`; `BaseModel.useDataSource(...)` escape hatch for tests. Matches the singleton-storage choice already made for metadata. |
| 2 | What `create()` means | **Build only (TypeORM-style).** `repo.create(data)` returns an unsaved instance. SQL only happens via `insert` / `save`. No surprise INSERTs. |
| 3 | Hydration | **`Object.create(prototype)` + assign.** User constructor never runs on read. Properties are direct-assigned; methods resolve via the prototype. |
| 4 | Relation loading | **Prisma-style `include` object map.** `{ include: { orders: { include: { items: true } } } }`. Nested config supports filtered includes; type-narrowing-friendly. No lazy proxies. |
| 5 | Write API | **Strict separation + smart `save`.** Explicit `insert()` and `update()` (no surprises) plus a `save()` that branches on PK presence for ergonomics. |
| 6 | Type narrowing | **Opt-in via `narrow: true` flag.** Default: methods return full `TEntity`. With `narrow: true` in the config, return type reflects `select`/`include`. See §4. |
| 7 | Scopes / custom queries | **Both supported.** AR statics on the model for one-liners (`User.findActive()`); opt-in `Repository<User>` subclass for serious queries. |
| 8 | Lifecycle hooks (`@BeforeInsert`, `@AfterLoad`, …) | **Deferred to v1.1.** CRUD-first; hooks are additive and easy to bolt on later. |

---

## 3. Repository surface (the engine)

The Repository is the canonical place where every per-entity operation is implemented exactly once.

```text
read:    findOne, find, count, exists
write:   create (build), insert, save (smart), update, upsert, delete
batch:   insertMany, saveMany
relation: loadRelation
escape:  query (raw), createQueryBuilder
```

- **Stateless per call.** Each method: build SQL → execute → hydrate. No per-instance dirty tracking.
- **No identity map.** Two `findOne(User, { id: 1 })` calls return *different* JS objects.
- **`save()` semantics**: branches on PK presence. Missing PK → INSERT. Present PK → UPDATE.

---

## 4. Type-narrowing design

### Two readings of the entity class

Given an entity declared with required relation properties:

```ts
class User {
  @PrimaryKey({ type: "integer" }) id!: number;
  @Column({ type: "string" })       name!: string;
  @OneToMany(() => Order, { inverseSide: "user" }) orders!: Relation<Order[]>;
}
```

…there are two coherent ways to interpret `User`'s static type when it comes out of a repository call:

- **As-declared (pragmatic, dishonest).** `findOne` returns `User`. The static type says `orders: Order[]` even when the relation wasn't loaded. Accessing it without an `include` is a runtime bug. Trade-off: zero ceremony, full intellisense, the most ergonomic option for typical use.
- **As-loaded (honest, computed).** The repository returns a *projection* built from `select` (which columns) and `include` (which relations). Anything not loaded is *absent* from the type. Trade-off: requires the `as const`-free narrowing machinery and the user opting in.

Default = as-declared. `narrow: true` switches to as-loaded. **`narrow` is the toggle between these two readings.**

### API shape

```ts
type FindArgs<T> = {
  where?: Where<T>;
  select?: SelectMap<T>;        // honored at runtime regardless of narrow
  include?: IncludeConfig<T>;    // honored at runtime regardless of narrow
  narrow?: true;                 // switches return-type reading only
  // orderBy, take, skip, etc.
};

findOne<A extends FindArgs<T>>(
  args?: A,
): Promise<(A extends { narrow: true } ? Strict<T, A> : T) | null>;
```

`Strict<T, A>` is computed (not additive over `T`):

```ts
type Strict<T, A> =
  // columns: filtered by select, or all-columns-no-relations if no select
  (A extends { select: infer S extends SelectMap<T> }
    ? Pick<T, keyof S & ColumnKeys<T>>
    : Omit<T, RelationKeys<T>>)
  &
  // relations: only those listed in include
  (A extends { include: infer I extends IncludeConfig<T> }
    ? IncludedRelations<T, I>
    : {});
```

The `Relation<T>` brand is what makes `RelationKeys<T>` reliably distinguish relation properties from columns of object/array shape (e.g. JSONB columns).

### Behavior — worked examples

Using the `User` class above:

```ts
// no narrow → class type as-declared (the type lies about orders if not included)
const u1 = await userRepo.findOne({ where: { id: 1 } });
//    ^? User | null               (orders typed Order[]; runtime: undefined)

const u2 = await userRepo.findOne({ where: { id: 1 }, select: { id: true, name: true } });
//    ^? User | null               (select honored at runtime; type stays User)

// narrow: true → as-loaded; relations not in include are stripped from the type
const u3 = await userRepo.findOne({ where: { id: 1 }, narrow: true });
//    ^? Omit<User, "orders"> | null
//    ≈ { id: number; name: string } | null

const u4 = await userRepo.findOne({
  where: { id: 1 },
  include: { orders: true },
  narrow: true,
});
//    ^? { id: number; name: string; orders: Order[] } | null

const u5 = await userRepo.findOne({
  where: { id: 1 },
  select: { id: true, name: true },
  narrow: true,
});
//    ^? { id: number; name: string } | null

const u6 = await userRepo.findOne({
  where: { id: 1 },
  select: { id: true },
  include: { orders: true },
  narrow: true,
});
//    ^? { id: number; orders: Order[] } | null
```

Key takeaway: **`narrow: true` is *replacement-from-scratch*, not an intersection layered over `T`.** Without `include`, narrowed results carry no relations; without `select`, narrowed results carry all columns.

### Implementation choices

- **One method, one signature.** Generic + conditional return type, no overloads.
- **`narrow?: true`** (only `true` is valid; omit to opt out). Restricting to the literal `true` keeps the conditional clean.
- **`SelectMap<T>` constrained to `{ [K in ColumnKeys<T>]?: true }`** (only `true` allowed, not `boolean`). Forces literal preservation through inference — **no `as const` needed at the call site**.
- **`select` and `include` are honored at runtime regardless of `narrow`.** `narrow` toggles which *reading* the static return type uses (as-declared vs as-loaded); it does not change SQL.
- **Relation marker convention**: relation properties on entities are declared as `Relation<Order[]>` / `Relation<User>`. Identity at runtime; branded for type-level lookup. The brand is what lets `Strict<T, A>` reliably strip relations the user didn't `include`, distinguishing them from JSONB / object-shape columns.

### Naming patterns (recommended user idiom)

To avoid downstream "unnamed result type" propagation, name the *args*, derive the return:

```ts
const userListArgs = {
  select: { id: true, name: true },
  include: { profile: true },
  narrow: true,
} satisfies FindArgs<User>;

type UserListItem = Strict<User, typeof userListArgs>;

async function listUsers(): Promise<UserListItem[]> {
  return userRepo.find(userListArgs);
}
```

`UserListItem` is a stable, importable name. Same ergonomics as `User`. Documented as the recommended pattern.

---

## 5. BaseModel surface (sugar)

Static methods mirror Repository. Instance methods cover per-row writes.

```ts
class BaseModel {
  static findOne, find, count, exists, create, insert
  instance: save(), delete(), reload()
  static useDataSource(ds): void   // test-time override
}
```

`this`-typing trick (`this: T extends typeof BaseModel`) ensures `User.findOne()` returns `Promise<User | null>`, not `Promise<BaseModel | null>`.

The `narrow` flag works on AR statics identically:

```ts
const u = await User.findOne({ where: { id: 1 }, select: { id: true }, narrow: true });
//    ^? { id: number } | null
```

---

## 6. Custom repositories

Power users extend `Repository<User>` to add domain methods:

```ts
class UserRepository extends Repository<User> {
  findActive(): Promise<User[]> { ... }
}
```

Registration is opt-in (e.g. `dataSource.getRepository(User, UserRepository)`). AR statics continue to work alongside.

---

## 7. Out of scope for v1

Explicit non-decisions to revisit later:

- **Identity map / change tracking** (Hibernate / EF Core / MikroORM-style). Re-evaluate when batched-transaction ergonomics become painful.
- **Lazy-loaded relations via proxies.** Explicit `include` only.
- **Lifecycle hook decorators** (`@BeforeInsert`, `@AfterLoad`, …). Trivially additive in v1.x.
- **Custom repository auto-registration / DI.** Manual registration is enough until DI shows up.
- **Migrations / schema diffing.** Separate module, separate concern.
- **Polymorphic / single-table inheritance.** Can require breaking changes to metadata; defer.
- **`AsyncLocalStorage`-scoped data sources.** Single global is enough; the `useDataSource()` override covers tests.

---

## 8. Trade-offs we accepted

- **Stateless repository ⇒ each `findOne` returns a new object.** Equality comparisons (`u1 === u2`) will be false. Trade-off for simplicity over identity-map correctness.
- **`save()`'s smart branching can mask bugs** when stale entities carry a PK from another context. Documented as "explicit `insert` / `update` are preferred for hot paths".
- **`Relation<T>` wrapper at every relation field** is friction users pay to enable relation-load type narrowing. Cheap, explicit, future-proof. Avoids the "is this a nullable column or an unloaded relation?" ambiguity Option B (optional-property convention) would create.
- **`select` is a runtime-only optimization unless `narrow: true` is set.** Users who want strict types opt in; default users avoid the "every method has its own unnamed return type" propagation pain.
- **Default reads return the class type as-declared, which type-lies about unloaded relations.** A `findOne` without `include` still types `user.orders` as `Order[]`; runtime is `undefined`. Accepted in exchange for ergonomic defaults. `narrow: true` is the escape hatch into honest types.
- **No identity-map ⇒ users can't rely on `===` for entity equality.** Compare by PK or use a hand-rolled identity helper if needed.
