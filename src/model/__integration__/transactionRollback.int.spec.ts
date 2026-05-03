import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

function newUserData(overrides: Partial<User> = {}): Partial<User> {
  return {
    email: "alice@example.com",
    displayName: "Alice",
    isActive: true,
    signupCount: 0,
    lastLoginAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("DataSource.transaction — rollback (integration)", () => {
  const fixture = setupModelFixture();

  it("rolls back writes when the callback throws and rethrows the original error", async () => {
    const ds = fixture.getDataSource();
    const original = new Error("boom");

    await expect(
      ds.transaction(async (em) => {
        await em.getRepository(User).insert(newUserData());
        throw original;
      }),
    ).rejects.toBe(original);

    const rows = await fixture.rawQuery("SELECT id FROM model_users");
    expect(rows).toHaveLength(0);
  });

  it("EM is closed even after the callback throws", async () => {
    const ds = fixture.getDataSource();

    let leakedEm: import("@/model/EntityManager").EntityManager | undefined;
    await expect(
      ds.transaction((em) => {
        leakedEm = em;
        throw new Error("nope");
      }),
    ).rejects.toThrow("nope");

    expect(leakedEm?.isClosed()).toBe(true);
  });
});
