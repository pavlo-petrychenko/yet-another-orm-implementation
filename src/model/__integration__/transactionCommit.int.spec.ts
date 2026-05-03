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

describe("DataSource.transaction — commit (integration)", () => {
  const fixture = setupModelFixture();

  it("commits writes when callback resolves", async () => {
    const ds = fixture.getDataSource();

    const result = await ds.transaction(async (em) => {
      const repo = em.getRepository(User);
      const u = await repo.insert(newUserData());
      return u.id;
    });

    expect(typeof result).toBe("number");
    const rows = await fixture.rawQuery<{ id: number; email: string }>(
      "SELECT id, email FROM model_users",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("alice@example.com");
  });

  it("propagates the callback's resolved value", async () => {
    const ds = fixture.getDataSource();
    const value = await ds.transaction(() => Promise.resolve({ ok: true, n: 42 }));
    expect(value).toEqual({ ok: true, n: 42 });
  });

  it("EM is closed after the callback resolves", async () => {
    const ds = fixture.getDataSource();

    let leakedEm: import("@/model/EntityManager").EntityManager | undefined;
    await ds.transaction((em) => {
      leakedEm = em;
      return Promise.resolve();
    });

    expect(leakedEm?.isClosed()).toBe(true);
    expect(() => leakedEm?.getRepository(User)).toThrow(/closed/);
  });
});
