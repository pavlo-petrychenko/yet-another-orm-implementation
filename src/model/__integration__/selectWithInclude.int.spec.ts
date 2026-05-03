import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("select + include (integration)", () => {
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

  it("Order.find with select + include user (M2O) auto-fetches FK and populates relation", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const u = await userRepo.insert(newUserData({ email: "owner@x.com" }));
    await orderRepo.insert({ userId: u.id, total: "10.00" });
    await orderRepo.insert({ userId: u.id, total: "20.00" });

    const orders = await orderRepo.find({
      select: { id: true, total: true },
      include: { user: true },
      orderBy: [{ id: "asc" }],
    });

    expect(orders).toHaveLength(2);
    for (const order of orders) {
      // userId is auto-included for the include resolver, so it leaks onto the instance.
      expect(order.userId).toBe(u.id);
      expect(order.user).toBeDefined();
      expect(order.user.id).toBe(u.id);
      expect(order.user.email).toBe("owner@x.com");
    }
  });

  it("User.find with select { id } + include orders (O2M) returns minimal user with orders array", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const u = await userRepo.insert(newUserData({ email: "minimal@x.com" }));
    await orderRepo.insert({ userId: u.id, total: "1.00" });

    const users = await userRepo.find({
      select: { id: true },
      include: { orders: true },
    });

    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(u.id);
    expect((users[0] as Partial<User>).email).toBeUndefined();
    expect(users[0].orders).toHaveLength(1);
    expect(users[0].orders[0].total).toBe("1.00");
  });
});
