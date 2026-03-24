# BaseModel

Active Record-style model layer. User entity classes extend `BaseModel` to get static CRUD methods and chainable query refinement, backed by the query builder and metadata systems.

## Class Hierarchy

```
BaseModelStatic<T>       — static methods: findAll, findOne, insert, update, delete
  └── BaseModel<T>       — instance methods: where, select, limit, offset, groupBy, orderBy, execute
```

Split into two classes so static methods (which create instances) live separately from instance methods (which refine and execute queries).

## Static Methods (`BaseModelStatic`)

All static methods read `MetadataStorage.getMetadata(this)` to get the table name and column definitions, then build a query and return a model instance with the query builder attached.

| Method | Query type | Description |
|---|---|---|
| `findAll(condition?)` | SELECT | Builds a SELECT from the entity table. Optional WHERE callback. |
| `findOne(condition?)` | SELECT | Same as `findAll` but adds `LIMIT 1`. |
| `insert(record)` | INSERT | Maps entity properties to column names using metadata, builds INSERT with values. |
| `update(record, condition?)` | UPDATE | Maps properties to columns, builds UPDATE SET. If no condition given, auto-generates WHERE from primary keys. |
| `delete(arg)` | DELETE | Accepts a WHERE callback, a single record, or an array of records. For records, auto-generates WHERE from primary keys (using `=` for single, `IN` for array). |

**Typing pattern:** All static methods use `this: T` where `T extends typeof BaseModelStatic` so that the return type is `InstanceType<T>` — the actual subclass, not `BaseModelStatic`.

**Column mapping** (in `insert` and `update`):
```
for each column in metadata.columns:
  columnName = column.name ?? column.propertyKey
  value = record[column.propertyKey]
  if value is truthy → add to fieldValueMap
```

Note: falsy values (`0`, `""`, `false`) are skipped due to the `if(value)` check.

## Instance Methods (`BaseModel`)

Returned by the static methods. Allow further query refinement before execution via method chaining. All cast the internal `queryBuilder` to `SelectQueryBuilder`.

| Method | Delegates to |
|---|---|
| `.where(buildFn)` | `SelectQueryBuilder.where()` |
| `.select(...columns)` | `SelectQueryBuilder.select()` |
| `.limit(count)` | `SelectQueryBuilder.limit()` |
| `.offset(count)` | `SelectQueryBuilder.offset()` |
| `.groupBy(...columns)` | `SelectQueryBuilder.groupBy()` |
| `.orderBy(column, direction)` | `SelectQueryBuilder.orderBy()` |
| `.execute()` | Builds the query, sends it through `Connection.getInstance().getDriver().query()`, returns `T[]` |

## Usage

```ts
@Entity("users")
class User extends BaseModel<User> {
    @PrimaryKey()
    id: number;

    @Column({ name: "user_name" })
    name: string;
}

// Find
const users = await User.findAll(w => w.where("age", ">", 18))
    .select("id", "user_name")
    .orderBy("user_name")
    .execute();

// Insert
await User.insert({ name: "Alice" }).execute();

// Update by primary key
await User.update({ id: 1, name: "Bob" }).execute();

// Delete with condition
await User.delete(w => w.where("id", "=", 1)).execute();
```

## Tests

`__tests__/BaseModel.test.ts` exists but is empty (no test cases).

## Known Issues

- `insert` has a stray `console.log(fieldValueMap)`.
- Falsy values (`0`, `""`, `false`) are silently dropped by `insert` and `update` due to `if(value)` truthiness check.
- Instance chaining methods cast to `SelectQueryBuilder` unconditionally — calling `.where()` on an insert/update/delete instance would fail at runtime.
