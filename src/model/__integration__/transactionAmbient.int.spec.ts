import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

function userData(email: string, displayName: string): Partial<User> {
  return {
    email,
    displayName,
    isActive: true,
    signupCount: 0,
    lastLoginAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("DataSource.transaction — ambient AR propagation (integration)", () => {
  const fixture = setupModelFixture();

  it("BaseModel statics inside the callback automatically use the tx", async () => {
    const ds = fixture.getDataSource();

    await ds.transaction(async () => {
      const inserted = await User.insert(userData("a@b", "A"));
      expect(inserted.id).toBeGreaterThan(0);

      const found = await User.findOne({ where: { email: "a@b" } });
      expect(found).not.toBeNull();
      expect(found?.email).toBe("a@b");
    });

    const rows = await fixture.rawQuery<{ email: string }>("SELECT email FROM model_users");
    expect(rows.map((r) => r.email)).toEqual(["a@b"]);
  });

  it("ambient rollback also reverts AR-driven writes", async () => {
    const ds = fixture.getDataSource();

    await expect(
      ds.transaction(async () => {
        await User.insert(userData("a@b", "A"));
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const rows = await fixture.rawQuery("SELECT id FROM model_users");
    expect(rows).toHaveLength(0);
  });

  it("repos created outside the callback participate in the ambient tx when called inside", async () => {
    const ds = fixture.getDataSource();
    const repo = ds.getRepository(User);

    await expect(
      ds.transaction(async () => {
        await repo.insert(userData("a@b", "A"));
        throw new Error("rollback me");
      }),
    ).rejects.toThrow("rollback me");

    const rows = await fixture.rawQuery("SELECT id FROM model_users");
    expect(rows).toHaveLength(0);
  });
});
