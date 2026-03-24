# Decorators

TypeScript decorators that register entity/column/relation metadata at class-load time. All decorators delegate to `MetadataStorage` (see `src/metadata/`). Requires `experimentalDecorators` and `emitDecoratorMetadata` in tsconfig.

## Decorators

### `@Entity(tableName?)` — class decorator

Registers a class as a database entity.

- If `tableName` is omitted, defaults to `constructor.name.toLowerCase()`.
- Calls `MetadataStorage.addEntity(constructor, tableName)`.
- Returns the original constructor unchanged.

```ts
@Entity("users")
class User { ... }
```

### `@Column(options?)` — property decorator

Marks a property as a database column.

- Uses `reflect-metadata` (`Reflect.getMetadata("design:type", ...)`) to infer the SQL type from the TypeScript type:

  | TS type | Inferred SQL type |
  |---|---|
  | `String` | `varchar` |
  | `Number` | `int` |
  | `Boolean` | `boolean` |
  | `Date` | `timestamp` |
  | anything else | `json` |

- Explicit `options.type` overrides the inferred type.
- `options.name` overrides the column name (defaults to the property name).
- Calls `MetadataStorage.addColumn(target, propertyKey, { type, name, ...options })`.

```ts
@Column()                          // inferred type + property name
name: string;

@Column({ type: "int", name: "user_age" })  // explicit overrides
age: number;
```

### `@PrimaryKey(options?)` — property decorator

Marks a property as a primary key.

- When called **without options**: calls `MetadataStorage.addPrimaryKey` with `{ name: propertyKey, type: "increment" }`.
- When called **with options**: currently does nothing (the `if (!options)` guard skips the call). This is a known quirk.
- Does **not** also register the column via `addColumn` — see known issues in `src/metadata/CLAUDE.md`.

```ts
@PrimaryKey()
id: number;
```

### Relation decorators — property decorators

Four exported decorators, all created by the same `createRelationDecorator` factory:

| Decorator | Relation type |
|---|---|
| `OneToOne` | `"OneToOne"` |
| `OneToMany` | `"OneToMany"` |
| `ManyToOne` | `"ManyToOne"` |
| `ManyToMany` | `"ManyToMany"` |

**Signature:** `(targetEntity, inverseSide?, options?) => PropertyDecorator`

- `targetEntity` — lazy function returning the related class constructor (e.g., `() => Post`). Lazy to avoid circular dependency issues.
- `inverseSide` — optional property name on the target entity.
- `options` — optional `RelationOptions` (`fkColumn`, `onDelete`, `onUpdate`).
- Calls `MetadataStorage.addRelation(target, propertyKey, relation)`.

```ts
@OneToMany(() => Post, "author")
posts: Post[];
```

## File Structure

```
decorators/
  entity/
    Entity.decorator.ts
    index.ts              — re-exports Entity
  column/
    Column.decorator.ts
    PrimaryKey.decorator.ts
    Relation.decorator.ts
    index.ts              — re-exports Column, PrimaryKey, relation decorators
```

Both `index.ts` barrels are re-exported from the top-level `src/index.ts`.

## Tests

Co-located in `__tests__/` directories:
- `Entity.decorator.test.ts` — tests entity registration and table name defaults
- `Column.decorator.test.ts` — tests type inference and option overrides (mocks `MetadataStorage`)
- `PrimaryKey.decorator.test.ts` — tests default options behavior (mocks `MetadataStorage`)
- `Relation.decorator.test.ts` — tests all four relation decorators with various option combinations (mocks `MetadataStorage`)
