import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("include OneToMany (integration)", () => {
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

  it("populates orders for users that have them and [] for those that don't", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const a = await userRepo.insert(newUserData({ email: "a@x.com" }));
    const b = await userRepo.insert(newUserData({ email: "b@x.com" }));

    await orderRepo.insert({ userId: a.id, total: "10.00" });
    await orderRepo.insert({ userId: a.id, total: "20.00" });
    await orderRepo.insert({ userId: a.id, total: "30.00" });

    const users = await userRepo.find({
      include: { orders: true },
      orderBy: [{ email: "asc" }],
    });

    expect(users).toHaveLength(2);
    const found = users.find((u) => u.id === a.id);
    const empty = users.find((u) => u.id === b.id);

    expect(found?.orders).toHaveLength(3);
    expect(Array.isArray(empty?.orders)).toBe(true);
    expect(empty?.orders).toHaveLength(0);
  });
});
