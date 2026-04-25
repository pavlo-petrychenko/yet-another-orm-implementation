import { Entity } from "@/decorators/Entity.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import { defaultMetadataStorage } from "@/metadata/storage";

describe("@PrimaryKey", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
  });

  it("marks the column as primary", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer", generated: "identity" })
      public id!: number;
    }

    const meta = defaultMetadataStorage.getEntity(User);
    expect(meta?.primaryColumns).toHaveLength(1);
    expect(meta?.primaryColumns[0]?.propertyName).toBe("id");
    expect(meta?.primaryColumns[0]?.generated).toBe("identity");
  });

  it("forces primary: true even if the user passes primary: false", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer", primary: false })
      public id!: number;
    }

    expect(defaultMetadataStorage.getEntity(User)?.primaryColumns).toHaveLength(1);
  });

  it("supports a primary key with no extra options", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "uuid" })
      public id!: string;
    }

    const col = defaultMetadataStorage.getEntity(User)?.primaryColumns[0];
    expect(col?.type).toBe("uuid");
    expect(col?.isPrimary).toBe(true);
  });
});
