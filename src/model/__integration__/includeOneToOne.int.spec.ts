import { Profile } from "@/model/__integration__/fixtures/Profile.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("include OneToOne (integration)", () => {
  const fixture = setupModelFixture();

  function newUserData(overrides: Partial<User> = {}): Partial<User> {
    return {
      email: "u@example.com",
      displayName: "U",
      isActive: true,
      signupCount: 0,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    };
  }

  it("inverse side: User.profile is populated when present, undefined otherwise", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const profileRepo = ds.getRepository(Profile);

    const withProfile = await userRepo.insert(newUserData({ email: "with@x.com" }));
    const withoutProfile = await userRepo.insert(newUserData({ email: "without@x.com" }));

    await profileRepo.insert({ userId: withProfile.id, bio: "hello" });

    const users = await userRepo.find({
      include: { profile: true },
      orderBy: [{ email: "asc" }],
    });

    const found = users.find((u) => u.id === withProfile.id);
    const empty = users.find((u) => u.id === withoutProfile.id);

    expect(found?.profile).toBeDefined();
    expect(found?.profile?.bio).toBe("hello");
    expect(empty?.profile).toBeUndefined();
  });

  it("owning side: Profile.user is populated", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const profileRepo = ds.getRepository(Profile);

    const inserted = await userRepo.insert(newUserData({ email: "owner@x.com" }));
    await profileRepo.insert({ userId: inserted.id, bio: "owned" });

    const profiles = await profileRepo.find({ include: { user: true } });

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user).toBeDefined();
    expect(profiles[0].user.id).toBe(inserted.id);
    expect(profiles[0].user.email).toBe("owner@x.com");
  });
});
