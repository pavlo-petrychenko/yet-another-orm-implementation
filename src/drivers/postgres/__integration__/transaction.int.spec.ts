import { setupDriver } from "@/drivers/postgres/__integration__/helpers";

describe("PostgresDriver.withTransaction (integration)", () => {
  const fixture = setupDriver("pool");

  beforeEach(async () => {
    await fixture.rawQuery("TRUNCATE users RESTART IDENTITY CASCADE");
  });

  it("commits writes when callback resolves", async () => {
    const driver = fixture.getDriver();
    await driver.withTransaction(async (tx) => {
      await tx.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["A", "a@x"]);
    });
    const rows = await fixture.rawQuery<{ name: string }>("SELECT name FROM users");
    expect(rows.map((r) => r.name)).toEqual(["A"]);
  });

  it("rolls back writes when callback throws", async () => {
    const driver = fixture.getDriver();
    await expect(
      driver.withTransaction(async (tx) => {
        await tx.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["A", "a@x"]);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const rows = await fixture.rawQuery("SELECT name FROM users");
    expect(rows).toHaveLength(0);
  });

  it("nested withTransaction uses savepoints — inner rollback preserves outer writes", async () => {
    const driver = fixture.getDriver();
    await driver.withTransaction(async (tx) => {
      await tx.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["outer", "o@x"]);
      await expect(
        tx.withTransaction(async (sp) => {
          await sp.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["inner", "i@x"]);
          throw new Error("inner-fail");
        }),
      ).rejects.toThrow("inner-fail");
    });

    const rows = await fixture.rawQuery<{ name: string }>("SELECT name FROM users ORDER BY name");
    expect(rows.map((r) => r.name)).toEqual(["outer"]);
  });

  it("nested withTransaction uses savepoints — both commit when both resolve", async () => {
    const driver = fixture.getDriver();
    await driver.withTransaction(async (tx) => {
      await tx.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["outer", "o@x"]);
      await tx.withTransaction(async (sp) => {
        await sp.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["inner", "i@x"]);
      });
    });

    const rows = await fixture.rawQuery<{ name: string }>("SELECT name FROM users ORDER BY name");
    expect(rows.map((r) => r.name)).toEqual(["inner", "outer"]);
  });

  it("pool pinning: BEGIN + INSERT + COMMIT all run on the same physical connection", async () => {
    // Smoke test: if pool pinning weren't honoured, the BEGIN and INSERT would land on
    // different pool clients and the row would not be inside any transaction. Empirically
    // we observe the row IS rolled back on throw — that proves pinning works.
    const driver = fixture.getDriver();
    await expect(
      driver.withTransaction(async (tx) => {
        await tx.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["pinned", "p@x"]);
        await tx.raw("INSERT INTO users (name, email) VALUES ($1, $2)", ["pinned2", "p2@x"]);
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    const rows = await fixture.rawQuery("SELECT name FROM users");
    expect(rows).toHaveLength(0);
  });
});
