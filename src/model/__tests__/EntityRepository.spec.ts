import { Entity } from "@/decorators/Entity.decorator";
import { EntityRepository } from "@/decorators/EntityRepository.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import { defaultMetadataStorage } from "@/metadata/storage";
import { ModelError } from "@/model/errors/ModelError";
import { Repository } from "@/model/Repository";
import { repositoryRegistry } from "@/model/repositoryRegistry";

describe("@EntityRepository", () => {
  beforeEach(() => {
    defaultMetadataStorage.clear();
    repositoryRegistry.clear();
  });

  it("registers the subclass in repositoryRegistry", () => {
    @Entity()
    class User {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }

    @EntityRepository(User)
    class UserRepository extends Repository<User> {
      public flag(): boolean { return true; }
    }

    expect(repositoryRegistry.get(User)).toBe(UserRepository);
  });

  it("decorating two repositories for the same entity throws DUPLICATE_REPOSITORY", () => {
    @Entity()
    class Post {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }

    @EntityRepository(Post)
    class PostRepoA extends Repository<Post> {}
    void PostRepoA;

    expect(() => {
      @EntityRepository(Post)
      class PostRepoB extends Repository<Post> {}
      void PostRepoB;
    }).toThrow(ModelError);
  });

  it("repositoryRegistry.clear() empties the registry", () => {
    @Entity()
    class Tag {
      @PrimaryKey({ type: "integer" })
      public id!: number;
    }

    @EntityRepository(Tag)
    class TagRepository extends Repository<Tag> {}
    void TagRepository;

    expect(repositoryRegistry.get(Tag)).toBeDefined();
    repositoryRegistry.clear();
    expect(repositoryRegistry.get(Tag)).toBeUndefined();
  });
});
