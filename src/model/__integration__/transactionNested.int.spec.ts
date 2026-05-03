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

describe("DataSource.transaction — nesting (integration)", () => {
  const fixture = setupModelFixture();

  it("inner throw caught in outer: outer commits, inner work is gone", async () => {
    const ds = fixture.getDataSource();

    await ds.transaction(async (outerEm) => {
      await outerEm.getRepository(User).insert(userData("outer@x", "Outer"));

      await expect(
        ds.transaction(async (innerEm) => {
          await innerEm.getRepository(User).insert(userData("inner@x", "Inner"));
          throw new Error("inner-fail");
        }),
      ).rejects.toThrow("inner-fail");
    });

    const rows = await fixture.rawQuery<{ email: string }>(
      "SELECT email FROM model_users ORDER BY email",
    );
    expect(rows.map((r) => r.email)).toEqual(["outer@x"]);
  });

  it("both inner and outer commit when both resolve", async () => {
    const ds = fixture.getDataSource();

    await ds.transaction(async (outerEm) => {
      await outerEm.getRepository(User).insert(userData("outer@x", "Outer"));
      await ds.transaction(async (innerEm) => {
        await innerEm.getRepository(User).insert(userData("inner@x", "Inner"));
      });
    });

    const rows = await fixture.rawQuery<{ email: string }>(
      "SELECT email FROM model_users ORDER BY email",
    );
    expect(rows.map((r) => r.email)).toEqual(["inner@x", "outer@x"]);
  });

  it("outer throw rolls back everything (inner commit is conceptual only — savepoints disappear)", async () => {
    const ds = fixture.getDataSource();

    await expect(
      ds.transaction(async (outerEm) => {
        await outerEm.getRepository(User).insert(userData("outer@x", "Outer"));
        await ds.transaction(async (innerEm) => {
          await innerEm.getRepository(User).insert(userData("inner@x", "Inner"));
        });
        throw new Error("outer-fail");
      }),
    ).rejects.toThrow("outer-fail");

    const rows = await fixture.rawQuery("SELECT id FROM model_users");
    expect(rows).toHaveLength(0);
  });
});
