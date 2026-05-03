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

describe("DataSource.transaction — concurrency (integration)", () => {
  const fixture = setupModelFixture();

  it("two parallel transactions on different async contexts don't see each other's uncommitted state", async () => {
    const ds = fixture.getDataSource();

    let txAEm: import("@/model/EntityManager").EntityManager | undefined;
    let txBEm: import("@/model/EntityManager").EntityManager | undefined;

    let releaseA = (): void => undefined;
    let releaseB = (): void => undefined;
    const gateA = new Promise<void>((r) => { releaseA = r; });
    const gateB = new Promise<void>((r) => { releaseB = r; });

    const txA = ds.transaction(async (em) => {
      txAEm = em;
      await em.getRepository(User).insert(userData("a@x", "A"));

      // Halfway through A: B hasn't committed yet, so A sees only its own row.
      await gateA;
      const aSees = await em.getRepository(User).find();
      const aEmails = aSees.map((u) => u.email).sort();
      expect(aEmails).toEqual(["a@x"]);
    });

    const txB = ds.transaction(async (em) => {
      txBEm = em;
      await em.getRepository(User).insert(userData("b@x", "B"));

      await gateB;
      const bSees = await em.getRepository(User).find();
      const bEmails = bSees.map((u) => u.email).sort();
      expect(bEmails).toEqual(["b@x"]);
    });

    // Let both insert, then release both in parallel.
    // Tiny stagger to ensure both have inserted before either reads.
    await new Promise<void>((r) => { setTimeout(() => { r(); }, 50); });
    releaseA();
    releaseB();

    await Promise.all([txA, txB]);

    expect(txAEm).toBeDefined();
    expect(txBEm).toBeDefined();

    const rows = await fixture.rawQuery<{ email: string }>(
      "SELECT email FROM model_users ORDER BY email",
    );
    expect(rows.map((r) => r.email)).toEqual(["a@x", "b@x"]);
  });
});
