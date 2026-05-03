import { CascOrder } from "@/model/__integration__/fixtures/cascade/CascOrder.entity";
import { CascOrderItem } from "@/model/__integration__/fixtures/cascade/CascOrderItem.entity";
import { CascUser } from "@/model/__integration__/fixtures/cascade/CascUser.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("cascade insert (integration)", () => {
  const fixture = setupModelFixture();

  it("walks User → Order[] → OrderItem[] in FK-correct order in one transaction", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(CascUser);

    const item1 = Object.assign(new CascOrderItem(), { qty: 2 });
    const item2 = Object.assign(new CascOrderItem(), { qty: 5 });
    const order1 = Object.assign(new CascOrder(), { total: "10.00", items: [item1] });
    const order2 = Object.assign(new CascOrder(), { total: "20.00", items: [item2] });
    const user = Object.assign(new CascUser(), {
      name: "U",
      email: "u@x.com",
      orders: [order1, order2],
    });

    const persisted = await userRepo.insert(user);

    expect(persisted.id).toBeGreaterThan(0);
    expect(order1.id).toBeGreaterThan(0);
    expect(order2.id).toBeGreaterThan(0);
    expect(order1.userId).toBe(persisted.id);
    expect(order2.userId).toBe(persisted.id);
    expect(item1.orderId).toBe(order1.id);
    expect(item2.orderId).toBe(order2.id);

    const userRows = await fixture.rawQuery<{ id: number }>("SELECT id FROM casc_users");
    expect(userRows).toHaveLength(1);
    const orderRows = await fixture.rawQuery<{ id: number; user_id: number }>("SELECT id, user_id FROM casc_orders ORDER BY id");
    expect(orderRows).toHaveLength(2);
    expect(orderRows.every((r) => r.user_id === persisted.id)).toBe(true);
    const itemRows = await fixture.rawQuery<{ id: number; order_id: number }>("SELECT id, order_id FROM casc_order_items ORDER BY id");
    expect(itemRows).toHaveLength(2);
  });

  it("rolls back the entire tree when a child INSERT fails", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(CascUser);

    const validItem = Object.assign(new CascOrderItem(), { qty: 1 });
    const badItem = Object.assign(new CascOrderItem(), { qty: null as unknown as number });
    const order = Object.assign(new CascOrder(), { total: "10.00", items: [validItem, badItem] });
    const user = Object.assign(new CascUser(), {
      name: "U",
      email: "rollback@x.com",
      orders: [order],
    });

    await expect(userRepo.insert(user)).rejects.toThrow();

    const userRows = await fixture.rawQuery("SELECT id FROM casc_users WHERE email = $1", ["rollback@x.com"]);
    expect(userRows).toHaveLength(0);
    const orderRows = await fixture.rawQuery("SELECT id FROM casc_orders");
    expect(orderRows).toHaveLength(0);
    const itemRows = await fixture.rawQuery("SELECT id FROM casc_order_items");
    expect(itemRows).toHaveLength(0);
  });
});
