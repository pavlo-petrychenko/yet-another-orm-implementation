import { CascOrder } from "@/model/__integration__/fixtures/cascade/CascOrder.entity";
import { CascOrderItem } from "@/model/__integration__/fixtures/cascade/CascOrderItem.entity";
import { CascUser } from "@/model/__integration__/fixtures/cascade/CascUser.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("DataSource.transaction — cascade interaction (integration)", () => {
  const fixture = setupModelFixture();

  it("cascade inside ambient tx degrades to savepoint; rollback unwinds the entire tree", async () => {
    const ds = fixture.getDataSource();

    await expect(
      ds.transaction(async (em) => {
        const item = Object.assign(new CascOrderItem(), { qty: 1 });
        const order = Object.assign(new CascOrder(), { total: "9.99", items: [item] });
        const user = Object.assign(new CascUser(), {
          name: "Tx",
          email: "tx@x",
          orders: [order],
        });

        await em.getRepository(CascUser).insert(user);
        expect(user.id).toBeGreaterThan(0);
        expect(order.id).toBeGreaterThan(0);
        expect(item.id).toBeGreaterThan(0);

        throw new Error("rollback the entire tree");
      }),
    ).rejects.toThrow("rollback the entire tree");

    const userRows = await fixture.rawQuery("SELECT id FROM casc_users");
    const orderRows = await fixture.rawQuery("SELECT id FROM casc_orders");
    const itemRows = await fixture.rawQuery("SELECT id FROM casc_order_items");
    expect(userRows).toHaveLength(0);
    expect(orderRows).toHaveLength(0);
    expect(itemRows).toHaveLength(0);
  });

  it("AR cascade inside ambient tx works the same way", async () => {
    const ds = fixture.getDataSource();

    await ds.transaction(async () => {
      const item = Object.assign(new CascOrderItem(), { qty: 7 });
      const order = Object.assign(new CascOrder(), { total: "9.99", items: [item] });
      const user = Object.assign(new CascUser(), {
        name: "AR",
        email: "ar@x",
        orders: [order],
      });

      await CascUser.insert(user);
    });

    const userRows = await fixture.rawQuery("SELECT id FROM casc_users");
    expect(userRows).toHaveLength(1);
  });
});
