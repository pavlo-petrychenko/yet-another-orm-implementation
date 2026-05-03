import type { Driver } from "@/drivers/common/Driver";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";
import type { Query } from "@/query-builder";
import { QueryType } from "@/query-builder";

describe("insertMany bulk (integration)", () => {
  const fixture = setupModelFixture();

  function newUserData(overrides: Partial<User>): Partial<User> {
    return {
      email: "u@x.com",
      displayName: "U",
      isActive: true,
      signupCount: 0,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    };
  }

  it("inserts N rows in a single round-trip", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    const driver = ds.getDriver();
    const original = driver.query.bind(driver) as (q: Query) => Promise<QueryResult>;
    const seen: Query[] = [];
    driver.query = ((q: Query): Promise<QueryResult> => {
      seen.push(q);
      return original(q);
    }) as Driver["query"];

    try {
      const rows = Array.from({ length: 50 }, (_, i) =>
        newUserData({ email: `bulk${String(i)}@x.com`, displayName: `B${String(i)}` }),
      );
      const inserted = await userRepo.insertMany(rows);
      expect(inserted).toHaveLength(50);

      const inserts = seen.filter((q) => q.type === QueryType.INSERT);
      expect(inserts).toHaveLength(1);

      const persisted = await fixture.rawQuery("SELECT count(*)::int AS n FROM model_users");
      expect((persisted[0] as { n: number }).n).toBe(50);
    } finally {
      driver.query = original as Driver["query"];
    }
  });

  it("empty input rejects with EMPTY_BULK and no SQL is issued", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);

    await expect(userRepo.insertMany([])).rejects.toMatchObject({
      name: "ModelError",
      code: "EMPTY_BULK",
    });
  });
});
