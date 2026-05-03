import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("upsert (integration)", () => {
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

  it("first call inserts a fresh row", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    const out = await userRepo.upsert(newUserData({ email: "a@x.com" }), ["email"]);
    expect(out.id).toBeGreaterThan(0);

    const rows = await fixture.rawQuery("SELECT count(*)::int AS n FROM model_users");
    expect((rows[0] as { n: number }).n).toBe(1);
  });

  it("second call with same conflict key updates the existing row in place", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    const first = await userRepo.upsert(
      newUserData({ email: "dup@x.com", displayName: "Original" }),
      ["email"],
    );

    const second = await userRepo.upsert(
      newUserData({ email: "dup@x.com", displayName: "Updated" }),
      ["email"],
    );

    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe("Updated");

    const rows = await fixture.rawQuery("SELECT count(*)::int AS n FROM model_users");
    expect((rows[0] as { n: number }).n).toBe(1);
  });

  it("update: 'do-nothing' preserves the existing row but returns the persisted entity", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    const first = await userRepo.upsert(
      newUserData({ email: "skip@x.com", displayName: "First" }),
      ["email"],
    );

    const second = await userRepo.upsert(
      newUserData({ email: "skip@x.com", displayName: "Should-Not-Win" }),
      ["email"],
      { update: "do-nothing" },
    );

    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe("First");
  });

  it("update: ['displayName'] only updates that one column", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    const first = await userRepo.upsert(
      newUserData({ email: "narrow@x.com", displayName: "First", isActive: true }),
      ["email"],
    );

    const second = await userRepo.upsert(
      newUserData({ email: "narrow@x.com", displayName: "Second", isActive: false }),
      ["email"],
      { update: ["displayName"] },
    );

    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe("Second");
    // isActive was NOT in the update list → original true wins
    expect(second.isActive).toBe(true);
  });

  it("missing conflict key in data rejects synchronously", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    await expect(
      userRepo.upsert(newUserData({ email: undefined as unknown as string }), ["email"]),
    ).rejects.toMatchObject({ name: "ModelError", code: "MISSING_CONFLICT_KEYS" });
  });
});
