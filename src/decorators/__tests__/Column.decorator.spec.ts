import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { defaultMetadataStorage } from "@/metadata/storage";

describe("@Column", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
  });

  it("registers a column with the property name as default columnName", () => {
    @Entity()
    class User {
      @Column({ type: "string" })
      public name!: string;
    }

    const col = defaultMetadataStorage.getEntity(User)?.columns[0];
    expect(col?.propertyName).toBe("name");
    expect(col?.columnName).toBe("name");
    expect(col?.type).toBe("string");
  });

  it("respects options.name override", () => {
    @Entity()
    class User {
      @Column({ type: "string", name: "full_name" })
      public fullName!: string;
    }

    expect(defaultMetadataStorage.getEntity(User)?.columns[0]?.columnName).toBe("full_name");
  });

  it("normalizes a bare scalar default to a literal DefaultValue", () => {
    @Entity()
    class User {
      @Column({ type: "integer", default: 18 })
      public age!: number;
    }

    expect(defaultMetadataStorage.getEntity(User)?.columns[0]?.default).toEqual({
      kind: "literal",
      value: 18,
    });
  });

  it("preserves an explicit DefaultValue object", () => {
    @Entity()
    class User {
      @Column({ type: "timestamptz", default: { kind: "raw", sql: "NOW()" } })
      public createdAt!: Date;
    }

    expect(defaultMetadataStorage.getEntity(User)?.columns[0]?.default).toEqual({
      kind: "raw",
      sql: "NOW()",
    });
  });

  it("rejects mismatched default type at compile time", () => {
    @Entity()
    class User {
      @Column({
        type: "string",
        default: 18,
      })
      public name!: string;
    }

    expect(defaultMetadataStorage.getEntity(User)).toBeDefined();
  });

  it("captures multiple columns in declaration order", () => {
    @Entity()
    class User {
      @Column({ type: "integer" })
      public id!: number;

      @Column({ type: "string" })
      public name!: string;

      @Column({ type: "boolean" })
      public active!: boolean;
    }

    const props = defaultMetadataStorage
      .getEntity(User)
      ?.columns.map((c) => c.propertyName);
    expect(props).toEqual(["id", "name", "active"]);
  });
});
