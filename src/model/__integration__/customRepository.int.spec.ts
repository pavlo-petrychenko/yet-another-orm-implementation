import { EntityRepository } from "@/decorators/EntityRepository.decorator";
import { Repository } from "@/model/Repository";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

@EntityRepository(User)
class UserRepository extends Repository<User> {
  public findActive(): Promise<User[]> {
    return this.find({ where: { isActive: true }, orderBy: [{ email: "asc" }] });
  }

  public findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }
}

describe("Custom Repository via @EntityRepository (integration)", () => {
  const fixture = setupModelFixture();

  function newUserData(overrides: Partial<User> = {}): Partial<User> {
    return {
      email: "user@example.com",
      displayName: "U",
      isActive: true,
      signupCount: 0,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    };
  }

  it("ds.getRepository(User) returns the registered subclass", () => {
    const repo = fixture.getDataSource().getRepository(User);
    expect(repo).toBeInstanceOf(UserRepository);
  });

  it("subclass methods work end-to-end", async () => {
    const repo = fixture.getDataSource().getRepository(User) as UserRepository;
    await repo.insert(newUserData({ email: "a@x.com", isActive: true }));
    await repo.insert(newUserData({ email: "b@x.com", isActive: false }));
    await repo.insert(newUserData({ email: "c@x.com", isActive: true }));

    const active = await repo.findActive();
    expect(active.map((u) => u.email)).toEqual(["a@x.com", "c@x.com"]);

    const found = await repo.findByEmail("b@x.com");
    expect(found?.email).toBe("b@x.com");
  });

  it("repeated getRepository returns the same cached subclass instance", () => {
    const a = fixture.getDataSource().getRepository(User);
    const b = fixture.getDataSource().getRepository(User);
    expect(a).toBe(b);
  });
});
