import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("include ManyToOne (integration)", () => {
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

  it("orderRepo.find({ include: { user: true } }) populates each order's user", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const inserted = await userRepo.insert(newUserData({ email: "owner@x.com" }));

    await orderRepo.insert({ userId: inserted.id, total: "10.00" });
    await orderRepo.insert({ userId: inserted.id, total: "20.00" });
    await orderRepo.insert({ userId: inserted.id, total: "30.00" });

    const orders = await orderRepo.find({
      include: { user: true },
      orderBy: [{ id: "asc" }],
    });

    expect(orders).toHaveLength(3);
    for (const order of orders) {
      expect(order.user).toBeDefined();
      expect(order.user.id).toBe(inserted.id);
      expect(order.user.email).toBe("owner@x.com");
    }
  });

  it("returns an empty list with no error when there are no rows", async () => {
    const orderRepo = fixture.getDataSource().getRepository(Order);
    const orders = await orderRepo.find({ include: { user: true } });
    expect(orders).toEqual([]);
  });
});
