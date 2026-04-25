import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { defaultMetadataStorage } from "@/metadata/storage";

describe("@Entity", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
  });

  it("registers the class as a queryable entity", () => {
    @Entity()
    class User {
      public id?: number;
    }

    const meta = defaultMetadataStorage.getEntity(User);
    expect(meta).toBeDefined();
    expect(meta?.target).toBe(User);
    expect(meta?.tableName).toBe("User");
  });

  it("uses options.name as the table name", () => {
    @Entity({ name: "users" })
    class User {
      public id?: number;
    }

    expect(defaultMetadataStorage.getEntity(User)?.tableName).toBe("users");
  });

  it("flushes pending columns on the class", () => {
    @Entity()
    class User {
      @Column({ type: "integer" })
      public id!: number;

      @Column({ type: "string" })
      public name!: string;
    }

    const meta = defaultMetadataStorage.getEntity(User);
    expect(meta?.columns.map((c) => c.propertyName)).toEqual(["id", "name"]);
  });

  it("a class with @Column but no @Entity is not registered", () => {
    class User {
      @Column({ type: "integer" })
      public id!: number;
    }

    expect(defaultMetadataStorage.getEntity(User)).toBeUndefined();
  });
});
