import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("select runtime pruning (integration)", () => {
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

  it("select { id, email } populates only those props; others are undefined", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    await userRepo.insert(newUserData({ email: "a@x.com" }));

    const found = await userRepo.find({ select: { id: true, email: true } });
    expect(found).toHaveLength(1);
    const u = found[0];
    expect(u.id).toBeGreaterThan(0);
    expect(u.email).toBe("a@x.com");
    expect((u as Partial<User>).displayName).toBeUndefined();
    expect((u as Partial<User>).isActive).toBeUndefined();
    expect((u as Partial<User>).signupCount).toBeUndefined();
  });

  it("no select → all columns hydrated", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    await userRepo.insert(newUserData({ email: "b@x.com", displayName: "Bob" }));

    const found = await userRepo.find();
    expect(found).toHaveLength(1);
    const u = found[0];
    expect(u.email).toBe("b@x.com");
    expect(u.displayName).toBe("Bob");
    expect(u.isActive).toBe(true);
  });

  it("narrow flag does not change emitted SQL given the same select", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    await userRepo.insert(newUserData({ email: "c@x.com" }));

    const queries: string[] = [];
    const driver = ds.getDriver();
    const original = driver.query.bind(driver);
    driver.query = ((q: Parameters<typeof original>[0]) => {
      const cols = "columns" in q && Array.isArray(q.columns)
        ? q.columns.map((c: { name: string }) => c.name).join(",")
        : "";
      queries.push(`${q.type}|${cols}`);
      return original(q);
    }) as typeof driver.query;

    try {
      await userRepo.find({ select: { id: true, email: true } });
      await userRepo.find({ select: { id: true, email: true }, narrow: true });
    } finally {
      driver.query = original;
    }

    expect(queries).toHaveLength(2);
    expect(queries[0]).toBe(queries[1]);
  });
});
