import { MetadataError } from "@/metadata/errors/MetadataError";
import { DefaultMetadataStorage } from "@/metadata/storage/DefaultMetadataStorage";
import type { EntityTarget } from "@/metadata/types";

class User {
  public id?: number;
}
class Order {
  public id?: number;
}

describe("DefaultMetadataStorage", () => {
  let storage: DefaultMetadataStorage;

  beforeEach(() => {
    storage = new DefaultMetadataStorage();
  });

  describe("registerEntity", () => {
    it("makes the entity retrievable", () => {
      storage.registerEntity(User);
      const meta = storage.getEntity(User);
      expect(meta).toBeDefined();
      expect(meta?.target).toBe(User);
      expect(meta?.className).toBe("User");
      expect(meta?.tableName).toBe("User");
      expect(meta?.columns).toEqual([]);
    });

    it("uses options.name as the table name", () => {
      storage.registerEntity(User, { name: "users" });
      expect(storage.getEntity(User)?.tableName).toBe("users");
    });

    it("throws DUPLICATE_ENTITY on second registration", () => {
      storage.registerEntity(User);
      try {
        storage.registerEntity(User);
        fail("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(MetadataError);
        expect((err as MetadataError).code).toBe("DUPLICATE_ENTITY");
      }
    });
  });

  describe("registerColumn", () => {
    it("links columns registered before the entity (orphan promotion)", () => {
      storage.registerColumn(User, "id", { type: "integer", primary: true });
      storage.registerColumn(User, "name", { type: "string" });
      storage.registerEntity(User);

      const meta = storage.getEntity(User);
      expect(meta?.columns.map((c) => c.propertyName)).toEqual(["id", "name"]);
      expect(meta?.primaryColumns).toHaveLength(1);
      expect(meta?.primaryColumns[0]?.propertyName).toBe("id");
    });

    it("supports columns registered after the entity", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "name", { type: "string" });
      expect(storage.getEntity(User)?.columns).toHaveLength(1);
    });

    it("defaults columnName to propertyName", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "fullName", { type: "string" });
      expect(storage.getEntity(User)?.columns[0]?.columnName).toBe("fullName");
    });

    it("respects explicit options.name", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "fullName", { type: "string", name: "full_name" });
      expect(storage.getEntity(User)?.columns[0]?.columnName).toBe("full_name");
    });

    it("normalizes a bare scalar default to literal", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "age", { type: "integer", default: 18 });
      expect(storage.getEntity(User)?.columns[0]?.default).toEqual({
        kind: "literal",
        value: 18,
      });
    });

    it("preserves an explicit DefaultValue object", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "createdAt", {
        type: "timestamptz",
        default: { kind: "raw", sql: "NOW()" },
      });
      expect(storage.getEntity(User)?.columns[0]?.default).toEqual({
        kind: "raw",
        sql: "NOW()",
      });
    });

    it("treats a Date default as a literal value", () => {
      const epoch = new Date(0);
      storage.registerEntity(User);
      storage.registerColumn(User, "createdAt", { type: "timestamptz", default: epoch });
      expect(storage.getEntity(User)?.columns[0]?.default).toEqual({
        kind: "literal",
        value: epoch,
      });
    });

    it("throws MISSING_COLUMN_TYPE when no type is provided", () => {
      try {
        storage.registerColumn(User, "x");
        fail("expected throw");
      } catch (err) {
        expect((err as MetadataError).code).toBe("MISSING_COLUMN_TYPE");
      }
    });

    it("throws DUPLICATE_COLUMN on a second registration of the same property", () => {
      storage.registerColumn(User, "name", { type: "string" });
      try {
        storage.registerColumn(User, "name", { type: "string" });
        fail("expected throw");
      } catch (err) {
        expect((err as MetadataError).code).toBe("DUPLICATE_COLUMN");
      }
    });

    it("throws COLUMN_RELATION_CONFLICT if the property is already a relation", () => {
      storage.registerRelation(User, "orders", {
        kind: "one-to-many",
        target: () => Order,
      });
      try {
        storage.registerColumn(User, "orders", { type: "string" });
        fail("expected throw");
      } catch (err) {
        expect((err as MetadataError).code).toBe("COLUMN_RELATION_CONFLICT");
      }
    });
  });

  describe("registerRelation", () => {
    it("registers a relation and exposes it on the metadata", () => {
      storage.registerEntity(User);
      storage.registerRelation(User, "orders", {
        kind: "one-to-many",
        target: () => Order,
        inverseSide: "user",
      });
      const meta = storage.getEntity(User);
      expect(meta?.relations).toHaveLength(1);
      expect(meta?.relations[0]?.kind).toBe("one-to-many");
      expect(meta?.relations[0]?.resolveTarget()).toBe(Order);
    });

    it("resolves joinColumn defaults", () => {
      storage.registerEntity(Order);
      storage.registerRelation(Order, "user", {
        kind: "many-to-one",
        target: () => User,
        joinColumn: {},
      });
      const rel = storage.getEntity(Order)?.relations[0];
      expect(rel?.joinColumn).toEqual({ columnName: "userId", referencedColumnName: "id" });
    });

    it("respects explicit joinColumn overrides", () => {
      storage.registerEntity(Order);
      storage.registerRelation(Order, "user", {
        kind: "many-to-one",
        target: () => User,
        joinColumn: { name: "owner_id", referencedColumnName: "uid" },
      });
      const rel = storage.getEntity(Order)?.relations[0];
      expect(rel?.joinColumn).toEqual({ columnName: "owner_id", referencedColumnName: "uid" });
    });

    it("throws DUPLICATE_RELATION on second registration of the same property", () => {
      storage.registerRelation(User, "orders", { kind: "one-to-many", target: () => Order });
      try {
        storage.registerRelation(User, "orders", { kind: "one-to-many", target: () => Order });
        fail("expected throw");
      } catch (err) {
        expect((err as MetadataError).code).toBe("DUPLICATE_RELATION");
      }
    });

    it("throws COLUMN_RELATION_CONFLICT if the property is already a column", () => {
      storage.registerColumn(User, "orders", { type: "string" });
      try {
        storage.registerRelation(User, "orders", { kind: "one-to-many", target: () => Order });
        fail("expected throw");
      } catch (err) {
        expect((err as MetadataError).code).toBe("COLUMN_RELATION_CONFLICT");
      }
    });
  });

  describe("inheritance", () => {
    it("inherits columns from a non-entity base class", () => {
      class BaseEntity { public id?: number; }
      class Account extends BaseEntity { public name?: string; }

      storage.registerColumn(BaseEntity, "id", { type: "integer", primary: true });
      storage.registerEntity(Account);
      storage.registerColumn(Account, "name", { type: "string" });

      const meta = storage.getEntity(Account);
      expect(meta?.columns.map((c) => c.propertyName)).toEqual(["id", "name"]);
      expect(meta?.primaryColumns[0]?.propertyName).toBe("id");
    });

    it("base @Entity and child @Entity both queryable; child wins on collision", () => {
      class BaseEntity { public id?: number; }
      class Account extends BaseEntity { public name?: string; }

      storage.registerEntity(BaseEntity);
      storage.registerColumn(BaseEntity, "id", { type: "integer", primary: true });
      storage.registerColumn(BaseEntity, "name", { type: "string", length: 10 });
      storage.registerEntity(Account);
      storage.registerColumn(Account, "name", { type: "string", length: 50 });

      const accountMeta = storage.getEntity(Account);
      expect(accountMeta?.columns.map((c) => c.propertyName)).toEqual(["id", "name"]);
      expect(accountMeta?.columns.find((c) => c.propertyName === "name")?.length).toBe(50);

      const baseMeta = storage.getEntity(BaseEntity);
      expect(baseMeta?.columns.find((c) => c.propertyName === "name")?.length).toBe(10);
    });

    it("a non-registered base class with columns is not itself queryable", () => {
      class BaseEntity { public id?: number; }
      class Account extends BaseEntity { public name?: string; }

      storage.registerColumn(BaseEntity, "id", { type: "integer" });
      storage.registerEntity(Account);

      expect(storage.getEntity(BaseEntity as unknown as EntityTarget)).toBeUndefined();
      expect(storage.hasEntity(BaseEntity as unknown as EntityTarget)).toBe(false);
    });
  });

  describe("getEntities", () => {
    it("only returns registered entities", () => {
      storage.registerColumn(User, "id", { type: "integer" });
      storage.registerEntity(Order);

      const entities = storage.getEntities();
      expect(entities.map((e) => e.target)).toEqual([Order]);
    });

    it("preserves registration order", () => {
      storage.registerEntity(User);
      storage.registerEntity(Order);
      expect(storage.getEntities().map((e) => e.target)).toEqual([User, Order]);
    });
  });

  describe("caching", () => {
    it("returns the same EntityMetadata instance across repeated reads", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "id", { type: "integer" });
      const a = storage.getEntity(User);
      const b = storage.getEntity(User);
      expect(a).toBe(b);
    });

    it("invalidates cached metadata when a new column is registered", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "id", { type: "integer" });
      const before = storage.getEntity(User);
      storage.registerColumn(User, "name", { type: "string" });
      const after = storage.getEntity(User);
      expect(after).not.toBe(before);
      expect(after?.columns).toHaveLength(2);
    });

    it("invalidates a child's cache when a base column is added", () => {
      class BaseEntity { public id?: number; }
      class Account extends BaseEntity { public name?: string; }

      storage.registerEntity(Account);
      const before = storage.getEntity(Account);
      expect(before?.columns).toHaveLength(0);

      storage.registerColumn(BaseEntity, "id", { type: "integer" });
      const after = storage.getEntity(Account);
      expect(after).not.toBe(before);
      expect(after?.columns).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("removes all entities, columns, and cache entries", () => {
      storage.registerEntity(User);
      storage.registerColumn(User, "id", { type: "integer" });
      storage.getEntity(User);

      storage.clear();
      expect(storage.getEntities()).toEqual([]);
      expect(storage.getEntity(User)).toBeUndefined();
    });
  });
});
