import type { Driver } from "@/drivers/common/Driver";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";
import type { Query } from "@/query-builder";

describe("narrow flag is type-only (integration)", () => {
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

  function captureQueries(): { unspy: () => void; queries: Query[] } {
    const driver = fixture.getDataSource().getDriver();
    const original = driver.query.bind(driver) as (q: Query) => Promise<QueryResult>;
    const queries: Query[] = [];
    driver.query = ((q: Query): Promise<QueryResult> => {
      queries.push(q);
      return original(q);
    }) as Driver["query"];
    return {
      unspy: (): void => { driver.query = original as Driver["query"]; },
      queries,
    };
  }

  function snapshotQuery(q: Query): string {
    return JSON.stringify(q);
  }

  it("emits identical SQL with and without narrow given the same select+include", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const u = await userRepo.insert(newUserData({ email: "x@x.com" }));
    await orderRepo.insert({ userId: u.id, total: "1.00" });

    const spy = captureQueries();
    try {
      await userRepo.find({ select: { id: true, email: true }, include: { orders: true } });
      const withoutNarrow = spy.queries.map(snapshotQuery);
      spy.queries.length = 0;
      await userRepo.find({ select: { id: true, email: true }, include: { orders: true }, narrow: true });
      const withNarrow = spy.queries.map(snapshotQuery);

      expect(withNarrow).toEqual(withoutNarrow);
    } finally {
      spy.unspy();
    }
  });
});
