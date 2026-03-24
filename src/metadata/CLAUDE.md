# Metadata

Runtime metadata store that collects information about entity classes, their columns, primary keys, and relations. Populated at class-load time by decorators (`@Entity`, `@Column`, `@PrimaryKey`, `@Relation`) from `src/decorators/`.

## Architecture

### Storage (`metadata-storage.ts`)

`MetadataStorageImpl` is a singleton class with a private constructor, backed by an internal `Map<EntityConstructor, EntityMetadata>`. The singleton instance is exported as `MetadataStorage`.

**Methods:**

| Method | Called by | Does |
|---|---|---|
| `addEntity(target, tableName)` | `@Entity` decorator | Registers a class constructor with a table name. Initializes empty columns, primaryKeys, and relations arrays. |
| `addColumn(target, propertyKey, options)` | `@Column` decorator | Adds column metadata. Auto-registers the entity if not yet known (fallback: class name lowercased as table name). |
| `addPrimaryKey(target, propertyKey, options)` | `@PrimaryKey` decorator | Registers column via `addColumn`, then adds property to `primaryKeys` array. |
| `addRelation(target, propertyKey, relation)` | `@Relation` decorators | Adds relation metadata. Throws if entity not registered with `@Entity`. |
| `getMetadata(target)` | `BaseModelStatic` methods | Returns `EntityMetadata` for a constructor, or `undefined` if not found. |
| `clear()` | Tests | Clears all stored metadata for test isolation. |

**Note:** `addEntity` and `addColumn` receive different `target` types:
- `addEntity` receives the **constructor** (`EntityConstructor`) — passed directly from the class decorator.
- `addColumn`, `addPrimaryKey`, `addRelation` receive the **prototype** (`object`) — passed from property decorators. They access the constructor via `target.constructor`.

### Types (`types/`)

**`EntityConstructor`** — type alias for entity class constructors (`new (...args: any[]) => any`).

**`EntityMetadata`** — the central type stored per entity:
```
{
  tableName: string
  columns: ColumnMetadata[]
  primaryKeys: string[]
  relations: RelationMetadata[]
}
```

**`ColumnMetadata`** extends `ColumnOptions`:
- `propertyKey` — the class property name
- `name?` — database column name (defaults to propertyKey)
- `type?` — database column type (e.g., `"varchar"`, `"int"`)

**`RelationMetadata`**:
- `type` — `"OneToOne" | "OneToMany" | "ManyToOne" | "ManyToMany"`
- `propertyKey` — the property on the source entity
- `targetEntity` — lazy function returning the target class constructor (avoids circular dependency issues)
- `inverseSide?` — property name on the target entity
- `options?` — `RelationOptions` with `fkColumn`, `onDelete`, `onUpdate`

## Data Flow

```
Class definition with decorators
  → @Entity("users")       → MetadataStorage.addEntity(User, "users")
  → @Column({type: "int"}) → MetadataStorage.addColumn(User.prototype, "age", ...)
  → @PrimaryKey()          → MetadataStorage.addPrimaryKey(User.prototype, "id", ...)
  → @OneToMany(...)        → MetadataStorage.addRelation(User.prototype, "posts", ...)

At query time:
  BaseModelStatic.findAll() → MetadataStorage.getMetadata(User) → uses tableName to build query
```

## Tests

`__tests__/metadata-storage.test.ts` — unit tests for the storage methods. Uses `beforeEach` with `MetadataStorage.clear()` for test isolation.
