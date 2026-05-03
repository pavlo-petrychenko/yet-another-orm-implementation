import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("saveMany transaction (integration)", () => {
  const fixture = setupModelFixture();

  function newUserData(overrides: Partial<User> = {}): Partial<User> {
    return {
      email: "u@x.com",
      displayName: "U",
      isActive: true,
      signupCount: 0,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    };
  }

  it("commits all entities on success", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    const a = userRepo.create(newUserData({ email: "a@x" }));
    const b = userRepo.create(newUserData({ email: "b@x" }));
    const c = userRepo.create(newUserData({ email: "c@x" }));

    await userRepo.saveMany([a, b, c]);
    expect(a.id).toBeGreaterThan(0);
    expect(b.id).toBeGreaterThan(0);
    expect(c.id).toBeGreaterThan(0);

    const rows = await fixture.rawQuery("SELECT count(*)::int AS n FROM model_users");
    expect((rows[0] as { n: number }).n).toBe(3);
  });

  it("rolls back the entire batch when one entity fails", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    const a = userRepo.create(newUserData({ email: "x1@x" }));
    const broken = userRepo.create(newUserData({ email: "x1@x" })); // duplicate email → unique violation
    const c = userRepo.create(newUserData({ email: "x3@x" }));

    await expect(userRepo.saveMany([a, broken, c])).rejects.toThrow();

    const rows = await fixture.rawQuery("SELECT count(*)::int AS n FROM model_users");
    expect((rows[0] as { n: number }).n).toBe(0);
  });
});
