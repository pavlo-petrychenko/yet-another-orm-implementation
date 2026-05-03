import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("BaseModel AR (integration)", () => {
  const fixture = setupModelFixture();

  function newUserData(): Partial<User> {
    return {
      email: "ar@example.com",
      displayName: "AR Tester",
      isActive: true,
      signupCount: 0,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
  }

  it("User.insert + User.findOne", async () => {
    const inserted = await User.insert(newUserData());

    expect(inserted).toBeInstanceOf(User);

    const found = await User.findOne({ where: { id: inserted.id } });
    expect(found?.email).toBe("ar@example.com");
  });

  it("user.save() inserts when PK absent, updates when PK present", async () => {
    const u = User.create(newUserData());
    await u.save();
    expect(typeof u.id).toBe("number");

    u.displayName = "Renamed";
    await u.save();

    const fresh = await User.findOneOrFail({ where: { id: u.id } });
    expect(fresh.displayName).toBe("Renamed");
  });

  it("user.delete() removes the row", async () => {
    const u = await User.insert(newUserData());
    await u.delete();
    expect(await User.findOne({ where: { id: u.id } })).toBeNull();
  });

  it("user.reload() refreshes the instance from the database", async () => {
    const u = await User.insert(newUserData());
    u.displayName = "stale";

    await u.reload();
    expect(u.displayName).toBe("AR Tester");
  });

  it("User.find supports where + orderBy + take", async () => {
    await User.insert({ ...newUserData(), email: "a@x.com", displayName: "A" });
    await User.insert({ ...newUserData(), email: "b@x.com", displayName: "B" });

    const list = await User.find({ orderBy: [{ displayName: "asc" }], take: 5 });
    expect(list.map((u) => u.displayName)).toEqual(["A", "B"]);
  });

  it("User.count and User.exists", async () => {
    await User.insert(newUserData());
    expect(await User.count()).toBe(1);
    expect(await User.exists({ email: "ar@example.com" })).toBe(true);
    expect(await User.exists({ email: "missing@x.com" })).toBe(false);
  });

  it("User.find({ include: { orders: true } }) populates orders via AR", async () => {
    const inserted = await User.insert(newUserData());
    const orderRepo = fixture.getDataSource().getRepository(Order);
    await orderRepo.insert({ userId: inserted.id, total: "10.00" });
    await orderRepo.insert({ userId: inserted.id, total: "20.00" });

    const users = await User.find({ include: { orders: true } });
    expect(users).toHaveLength(1);
    expect(users[0].orders).toHaveLength(2);
  });

  it("user.loadRelation('orders') mutates `this`", async () => {
    const inserted = await User.insert(newUserData());
    const orderRepo = fixture.getDataSource().getRepository(Order);
    await orderRepo.insert({ userId: inserted.id, total: "10.00" });

    const user = await User.findOneOrFail({ where: { id: inserted.id } });
    expect(user.orders).toBeUndefined();

    const loaded = await user.loadRelation("orders");
    expect(loaded).toHaveLength(1);
    expect(user.orders).toHaveLength(1);
  });

  it("User.find with select { id } prunes columns at runtime", async () => {
    await User.insert(newUserData());

    const users = await User.find({ select: { id: true } });
    expect(users).toHaveLength(1);
    expect(users[0].id).toBeGreaterThan(0);
    expect((users[0] as Partial<User>).email).toBeUndefined();
    expect((users[0] as Partial<User>).displayName).toBeUndefined();
  });

  it("User.findOne with narrow + select returns runtime-equivalent shape", async () => {
    const inserted = await User.insert(newUserData());

    const narrow = await User.findOne({
      where: { id: inserted.id },
      select: { id: true, email: true },
      narrow: true,
    });
    expect(narrow).not.toBeNull();
    expect(narrow?.id).toBe(inserted.id);
    expect(narrow?.email).toBe("ar@example.com");
  });

  it("User.insertMany inserts N rows", async () => {
    const rows = await User.insertMany([
      { ...newUserData(), email: "im1@x.com" },
      { ...newUserData(), email: "im2@x.com" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBeInstanceOf(User);
    expect(await User.count()).toBe(2);
  });

  it("User.saveMany commits a batch of new entities atomically", async () => {
    const a = User.create({ ...newUserData(), email: "sm1@x.com" });
    const b = User.create({ ...newUserData(), email: "sm2@x.com" });
    await User.saveMany([a, b]);
    expect(a.id).toBeGreaterThan(0);
    expect(b.id).toBeGreaterThan(0);
  });

  it("User.deleteMany alias works", async () => {
    await User.insert(newUserData());
    const removed = await User.deleteMany({ email: "ar@example.com" });
    expect(removed).toBe(1);
    expect(await User.count()).toBe(0);
  });

  it("User.upsert by email — insert path then update path", async () => {
    const first = await User.upsert(
      { ...newUserData(), email: "ar-up@x.com", displayName: "First" },
      ["email"],
    );
    const second = await User.upsert(
      { ...newUserData(), email: "ar-up@x.com", displayName: "Second" },
      ["email"],
    );
    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe("Second");
    expect(await User.count()).toBe(1);
  });
});
