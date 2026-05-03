import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { Profile } from "@/model/__integration__/fixtures/Profile.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("include nested + multi-sibling (integration)", () => {
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

  it("recurses User → orders → user round-trip", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const a = await userRepo.insert(newUserData({ email: "a@x.com" }));
    await orderRepo.insert({ userId: a.id, total: "10.00" });
    await orderRepo.insert({ userId: a.id, total: "20.00" });

    const users = await userRepo.find({
      include: { orders: { include: { user: true } } },
    });

    expect(users).toHaveLength(1);
    expect(users[0].orders).toHaveLength(2);
    for (const order of users[0].orders) {
      expect(order.user.id).toBe(a.id);
      expect(order.user.email).toBe("a@x.com");
      expect(order.user).not.toBe(users[0]);
    }
  });

  it("loads multiple sibling relations at the same level", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);
    const profileRepo = ds.getRepository(Profile);

    const u = await userRepo.insert(newUserData({ email: "siblings@x.com" }));
    await orderRepo.insert({ userId: u.id, total: "10.00" });
    await profileRepo.insert({ userId: u.id, bio: "the bio" });

    const found = await userRepo.findOneOrFail({
      where: { id: u.id },
      include: { orders: true, profile: true },
    });

    expect(found.orders).toHaveLength(1);
    expect(found.profile?.bio).toBe("the bio");
  });
});
