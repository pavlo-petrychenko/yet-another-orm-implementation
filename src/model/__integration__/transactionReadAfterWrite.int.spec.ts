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

describe("DataSource.transaction — read-after-write (integration)", () => {
  const fixture = setupModelFixture();

  it("a SELECT inside the tx returns its own pending INSERT", async () => {
    const ds = fixture.getDataSource();

    await ds.transaction(async (em) => {
      const repo = em.getRepository(User);
      const inserted = await repo.insert(userData("u@x", "U"));

      const found = await repo.findOne({ where: { id: inserted.id } });
      expect(found).not.toBeNull();
      expect(found?.email).toBe("u@x");

      const all = await repo.find();
      expect(all).toHaveLength(1);
    });
  });

  it("UPDATE then SELECT inside the tx reflects the patch", async () => {
    const ds = fixture.getDataSource();

    await ds.transaction(async (em) => {
      const repo = em.getRepository(User);
      const u = await repo.insert(userData("u@x", "before"));
      await repo.update({ id: u.id }, { displayName: "after" });
      const reread = await repo.findOneOrFail({ where: { id: u.id } });
      expect(reread.displayName).toBe("after");
    });
  });
});
