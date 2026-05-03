import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("deleteMany bulk (integration)", () => {
  const fixture = setupModelFixture();

  function newUserData(overrides: Partial<User>): Partial<User> {
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

  it("deletes every matching row in one statement", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    await userRepo.insertMany([
      newUserData({ email: "a@x", isActive: false }),
      newUserData({ email: "b@x", isActive: false }),
      newUserData({ email: "c@x", isActive: true }),
    ]);

    const removed = await userRepo.deleteMany({ isActive: false });
    expect(removed).toBe(2);

    const rows = await fixture.rawQuery<{ email: string }>(
      "SELECT email FROM model_users ORDER BY email",
    );
    expect(rows.map((r) => r.email)).toEqual(["c@x"]);
  });
});
