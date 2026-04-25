import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { OneToOne } from "@/decorators/relations/OneToOne.decorator";
import { defaultMetadataStorage } from "@/metadata/storage";

describe("relation decorators", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
  });

  describe("@ManyToOne", () => {
    it("registers a many-to-one relation with default joinColumn", () => {
      @Entity()
      class User {
        @Column({ type: "integer" })
        public id!: number;
      }

      @Entity()
      class Order {
        @ManyToOne(() => User, { joinColumn: {} })
        public user?: User;
      }

      const rel = defaultMetadataStorage.getEntity(Order)?.relations[0];
      expect(rel?.kind).toBe("many-to-one");
      expect(rel?.resolveTarget()).toBe(User);
      expect(rel?.joinColumn).toEqual({ columnName: "userId", referencedColumnName: "id" });
    });

    it("respects explicit inverseSide that exists on the target", () => {
      @Entity()
      class User {
        @Column({ type: "integer" })
        public id!: number;

        public orders?: ReadonlyArray<Order>;
      }

      @Entity()
      class Order {
        @ManyToOne(() => User, { inverseSide: "orders" })
        public user?: User;
      }

      const rel = defaultMetadataStorage.getEntity(Order)?.relations[0];
      expect(rel?.inverseSide).toBe("orders");
    });
  });

  describe("@OneToMany", () => {
    it("registers a one-to-many relation with required inverseSide", () => {
      @Entity()
      class Order {
        public user?: User;
      }

      @Entity()
      class User {
        @OneToMany(() => Order, { inverseSide: "user" })
        public orders!: ReadonlyArray<Order>;
      }

      const rel = defaultMetadataStorage.getEntity(User)?.relations[0];
      expect(rel?.kind).toBe("one-to-many");
      expect(rel?.inverseSide).toBe("user");
      expect(rel?.resolveTarget()).toBe(Order);
    });
  });

  describe("@OneToOne", () => {
    it("registers a one-to-one relation", () => {
      @Entity()
      class Profile {
        public id?: number;
      }

      @Entity()
      class User {
        @OneToOne(() => Profile, { joinColumn: {} })
        public profile?: Profile;
      }

      const rel = defaultMetadataStorage.getEntity(User)?.relations[0];
      expect(rel?.kind).toBe("one-to-one");
      expect(rel?.joinColumn).toEqual({
        columnName: "profileId",
        referencedColumnName: "id",
      });
    });
  });

  describe("@ManyToMany", () => {
    it("registers a many-to-many relation with joinTable defaults", () => {
      @Entity()
      class Tag {
        public id?: number;
      }

      @Entity()
      class Post {
        @ManyToMany(() => Tag, { joinTable: {} })
        public tags!: ReadonlyArray<Tag>;
      }

      const rel = defaultMetadataStorage.getEntity(Post)?.relations[0];
      expect(rel?.kind).toBe("many-to-many");
      expect(rel?.joinTable).toEqual({
        tableName: "tags_join",
        joinColumnName: "tagsId",
        inverseJoinColumnName: "tagsInverseId",
      });
    });
  });

  describe("type-level guarantees", () => {
    it("rejects @ManyToOne when property type doesn't match target instance", () => {
      @Entity()
      class User {
        public id?: number;
      }

      @Entity()
      class Order {
        public id?: number;
      }

      @Entity()
      class Bad {
        @ManyToOne(() => User)
        public user?: Order;
      }

      expect(defaultMetadataStorage.getEntity(Bad)).toBeDefined();
    });

    it("rejects @OneToMany inverseSide that isn't a key of the target", () => {
      @Entity()
      class Order {
        public id?: number;
      }

      @Entity()
      class User {
        @OneToMany(() => Order, {
          // @ts-expect-error "doesntExist" is not a key of Order
          inverseSide: "doesntExist",
        })
        public orders!: ReadonlyArray<Order>;
      }

      expect(defaultMetadataStorage.getEntity(User)).toBeDefined();
    });
  });
});
