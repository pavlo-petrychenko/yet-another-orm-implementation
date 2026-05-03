import type { Driver } from "@/drivers/common/Driver";
import type { QueryResult } from "@/drivers/types/QueryResult";
import { Order } from "@/model/__integration__/fixtures/Order.entity";
import { Post } from "@/model/__integration__/fixtures/Post.entity";
import { Profile } from "@/model/__integration__/fixtures/Profile.entity";
import { Tag } from "@/model/__integration__/fixtures/Tag.entity";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";
import type { Query } from "@/query-builder";

describe("include N+1 audit (integration)", () => {
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

  function spyOnDriverQuery(): { unspy: () => void; count: () => number } {
    const driver = fixture.getDataSource().getDriver();
    const original = driver.query.bind(driver) as (query: Query) => Promise<QueryResult>;
    let count = 0;
    driver.query = ((query: Query): Promise<QueryResult> => {
      count++;
      return original(query);
    }) as Driver["query"];
    return {
      unspy: (): void => { driver.query = original as Driver["query"]; },
      count: (): number => count,
    };
  }

  it("User.find({ include: { orders: true } }) issues exactly 2 queries", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const a = await userRepo.insert(newUserData({ email: "a@x.com" }));
    const b = await userRepo.insert(newUserData({ email: "b@x.com" }));
    await orderRepo.insert({ userId: a.id, total: "1.00" });
    await orderRepo.insert({ userId: b.id, total: "2.00" });

    const spy = spyOnDriverQuery();
    try {
      await userRepo.find({ include: { orders: true } });
      expect(spy.count()).toBe(2);
    } finally {
      spy.unspy();
    }
  });

  it("two sibling relations issue 3 queries", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);
    const profileRepo = ds.getRepository(Profile);

    const u = await userRepo.insert(newUserData({ email: "u@x.com" }));
    await orderRepo.insert({ userId: u.id, total: "1.00" });
    await profileRepo.insert({ userId: u.id, bio: "x" });

    const spy = spyOnDriverQuery();
    try {
      await userRepo.find({ include: { orders: true, profile: true } });
      expect(spy.count()).toBe(3);
    } finally {
      spy.unspy();
    }
  });

  it("nested include issues query-per-level (3 queries for User → orders → user)", async () => {
    const ds = fixture.getDataSource();
    const userRepo = ds.getRepository(User);
    const orderRepo = ds.getRepository(Order);

    const a = await userRepo.insert(newUserData({ email: "a@x.com" }));
    await orderRepo.insert({ userId: a.id, total: "1.00" });
    await orderRepo.insert({ userId: a.id, total: "2.00" });

    const spy = spyOnDriverQuery();
    try {
      await userRepo.find({ include: { orders: { include: { user: true } } } });
      expect(spy.count()).toBe(3);
    } finally {
      spy.unspy();
    }
  });

  it("ManyToMany issues 3 queries (parents, join table, target)", async () => {
    const ds = fixture.getDataSource();
    const postRepo = ds.getRepository(Post);
    const tagRepo = ds.getRepository(Tag);

    const t = await tagRepo.insert({ name: "x" });
    const p = await postRepo.insert({ title: "p1" });
    await fixture.rawQuery(
      `INSERT INTO model_post_tags (post_id, tag_id) VALUES ($1, $2)`,
      [p.id, t.id],
    );

    const spy = spyOnDriverQuery();
    try {
      await postRepo.find({ include: { tags: true } });
      expect(spy.count()).toBe(3);
    } finally {
      spy.unspy();
    }
  });
});
