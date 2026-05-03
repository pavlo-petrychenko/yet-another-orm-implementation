import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { OneToOne } from "@/decorators/relations/OneToOne.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import type { Driver } from "@/drivers/common/Driver";
import type { Dialect } from "@/drivers/common/Dialect";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import type { QueryResult } from "@/drivers/types/QueryResult";
import type { EntityTarget, EntityMetadata } from "@/metadata/types";
import { defaultMetadataStorage } from "@/metadata/storage";
import { DataSource } from "@/model/DataSource";
import { loadIncludes } from "@/model/internal/loadIncludes";
import type { IncludeConfig } from "@/model/types/IncludeConfig";
import type { Relation } from "@/model/types/Relation";
import type { Query } from "@/query-builder";
import { QueryType, type SelectQuery } from "@/query-builder/types";

const fakePgConfig: PostgresDriverConfig = {
  type: DBType.POSTGRES,
  host: "x",
  port: 1,
  user: "u",
  password: "p",
  database: "d",
};

@Entity({ name: "rl_users" })
class RlUser {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public name!: string;

  @OneToMany(() => RlOrder, { inverseSide: "user" })
  public orders!: Relation<RlOrder[]>;

  @OneToOne(() => RlProfile, { inverseSide: "user" })
  public profile!: Relation<RlProfile | undefined>;
}

@Entity({ name: "rl_orders" })
class RlOrder {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @ManyToOne(() => RlUser, { joinColumn: { name: "user_id" }, inverseSide: "orders" })
  public user!: Relation<RlUser>;
}

@Entity({ name: "rl_profiles" })
class RlProfile {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @OneToOne(() => RlUser, { joinColumn: { name: "user_id" }, inverseSide: "profile" })
  public user!: Relation<RlUser>;
}

@Entity({ name: "rl_posts" })
class RlPost {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @ManyToMany(() => RlTag, {
    joinTable: {
      name: "rl_post_tags",
      joinColumn: { name: "post_id" },
      inverseJoinColumn: { name: "tag_id" },
    },
    inverseSide: "posts",
  })
  public tags!: Relation<RlTag[]>;
}

@Entity({ name: "rl_tags" })
class RlTag {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @ManyToMany(() => RlPost, { inverseSide: "tags" })
  public posts!: Relation<RlPost[]>;
}

class FakeDriver implements Driver {
  public calls: Query[] = [];
  public responses: Array<Record<string, unknown>[]> = [];

  public connect(): Promise<void> { return Promise.resolve(); }
  public disconnect(): Promise<void> { return Promise.resolve(); }
  public isConnected(): boolean { return true; }
  public getDialect(): Dialect { throw new Error("not used"); }
  public query<TRow = Record<string, unknown>>(query: Query): Promise<QueryResult<TRow>> {
    this.calls.push(query);
    const rows = this.responses.shift() ?? [];
    return Promise.resolve({ rows: rows as TRow[], rowCount: rows.length });
  }
  public raw<TRow = Record<string, unknown>>(): Promise<QueryResult<TRow>> {
    return Promise.resolve({ rows: [] as TRow[], rowCount: 0 });
  }
  public withTransaction<R>(fn: (tx: Driver) => Promise<R>): Promise<R> {
    return fn(this);
  }
}

function getMeta(target: EntityTarget): EntityMetadata {
  const meta = defaultMetadataStorage.getEntity(target);
  if (!meta) throw new Error(`No metadata for ${target.name}`);
  return meta;
}

function makeDs(driver: FakeDriver): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "driver", { value: driver, writable: false, configurable: true });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

function asSelect(q: Query): SelectQuery {
  if (q.type !== QueryType.SELECT) throw new Error("expected SELECT");
  return q;
}

describe("relation loaders (unit)", () => {
  describe("ManyToOne", () => {
    it("issues SELECT with WHERE id IN (deduped fk values) and attaches singular", async () => {
      const driver = new FakeDriver();
      driver.responses = [[{ id: 1, name: "A" }, { id: 2, name: "B" }]];
      const ds = makeDs(driver);
      const meta = getMeta(RlOrder);

      const orders: Array<Record<string, unknown>> = [
        { id: 10, userId: 1 },
        { id: 11, userId: 2 },
        { id: 12, userId: 1 },
      ];

      await loadIncludes<object>(ds, orders, meta, { user: true } as IncludeConfig<object>, 0);

      expect(driver.calls).toHaveLength(1);
      const q = asSelect(driver.calls[0]);
      expect(q.where).toBeDefined();
      expect((q.table as { name: string }).name).toBe("rl_users");

      expect(orders[0].user).toEqual({ id: 1, name: "A" });
      expect(orders[1].user).toEqual({ id: 2, name: "B" });
      expect(orders[2].user).toEqual({ id: 1, name: "A" });
    });

    it("attaches undefined when fk is null and short-circuits with no query", async () => {
      const driver = new FakeDriver();
      const ds = makeDs(driver);
      const meta = getMeta(RlOrder);

      const orders: Array<Record<string, unknown>> = [{ id: 10, userId: null }];
      await loadIncludes<object>(ds, orders, meta, { user: true } as IncludeConfig<object>, 0);

      expect(driver.calls).toHaveLength(0);
      expect(orders[0].user).toBeUndefined();
    });
  });

  describe("OneToMany", () => {
    it("issues SELECT with user_id IN (...), groups by FK, empty parents get []", async () => {
      const driver = new FakeDriver();
      driver.responses = [[
        { id: 10, user_id: 1 },
        { id: 11, user_id: 1 },
        { id: 12, user_id: 2 },
      ]];
      const ds = makeDs(driver);
      const meta = getMeta(RlUser);

      const users: Array<Record<string, unknown>> = [{ id: 1 }, { id: 2 }, { id: 3 }];
      await loadIncludes<object>(ds, users, meta, { orders: true } as IncludeConfig<object>, 0);

      expect(driver.calls).toHaveLength(1);
      const q = asSelect(driver.calls[0]);
      expect((q.table as { name: string }).name).toBe("rl_orders");

      expect(users[0].orders).toHaveLength(2);
      expect(users[1].orders).toHaveLength(1);
      expect(users[2].orders).toEqual([]);
    });
  });

  describe("OneToOne (inverse)", () => {
    it("attaches singular (list[0] or undefined)", async () => {
      const driver = new FakeDriver();
      driver.responses = [[{ id: 100, user_id: 1 }]];
      const ds = makeDs(driver);
      const meta = getMeta(RlUser);

      const users: Array<Record<string, unknown>> = [{ id: 1 }, { id: 2 }];
      await loadIncludes<object>(ds, users, meta, { profile: true } as IncludeConfig<object>, 0);

      expect(users[0].profile).toEqual({ id: 100, userId: 1 });
      expect(users[1].profile).toBeUndefined();
    });
  });

  describe("OneToOne (owning)", () => {
    it("delegates to ManyToOne path: SELECT FROM target WHERE id IN (...)", async () => {
      const driver = new FakeDriver();
      driver.responses = [[{ id: 1, name: "A" }]];
      const ds = makeDs(driver);
      const meta = getMeta(RlProfile);

      const profiles: Array<Record<string, unknown>> = [{ id: 100, userId: 1 }];
      await loadIncludes<object>(ds, profiles, meta, { user: true } as IncludeConfig<object>, 0);

      expect(driver.calls).toHaveLength(1);
      expect(profiles[0].user).toEqual({ id: 1, name: "A" });
    });
  });

  describe("ManyToMany", () => {
    it("emits 2 queries (join table + target) and attaches arrays", async () => {
      const driver = new FakeDriver();
      driver.responses = [
        // Q1: join-table rows
        [
          { post_id: 1, tag_id: 100 },
          { post_id: 1, tag_id: 101 },
          { post_id: 2, tag_id: 100 },
        ],
        // Q2: target rows
        [
          { id: 100 },
          { id: 101 },
        ],
      ];
      const ds = makeDs(driver);
      const meta = getMeta(RlPost);

      const posts: Array<Record<string, unknown>> = [{ id: 1 }, { id: 2 }, { id: 3 }];
      await loadIncludes<object>(ds, posts, meta, { tags: true } as IncludeConfig<object>, 0);

      expect(driver.calls).toHaveLength(2);
      const q1 = asSelect(driver.calls[0]);
      expect((q1.table as { name: string }).name).toBe("rl_post_tags");
      const q2 = asSelect(driver.calls[1]);
      expect((q2.table as { name: string }).name).toBe("rl_tags");

      expect(posts[0].tags).toHaveLength(2);
      expect(posts[1].tags).toHaveLength(1);
      expect(posts[2].tags).toEqual([]);
    });

    it("skips Q2 and attaches [] when join-table has no matching rows", async () => {
      const driver = new FakeDriver();
      driver.responses = [[]];
      const ds = makeDs(driver);
      const meta = getMeta(RlPost);

      const posts: Array<Record<string, unknown>> = [{ id: 1 }];
      await loadIncludes<object>(ds, posts, meta, { tags: true } as IncludeConfig<object>, 0);

      expect(driver.calls).toHaveLength(1);
      expect(posts[0].tags).toEqual([]);
    });

    it("inverse side reuses owning side's joinTable with flipped column roles", async () => {
      const driver = new FakeDriver();
      driver.responses = [
        [{ post_id: 1, tag_id: 100 }],
        [{ id: 1 }],
      ];
      const ds = makeDs(driver);
      const meta = getMeta(RlTag);

      const tags: Array<Record<string, unknown>> = [{ id: 100 }];
      await loadIncludes<object>(ds, tags, meta, { posts: true } as IncludeConfig<object>, 0);

      expect(driver.calls).toHaveLength(2);
      const q1 = asSelect(driver.calls[0]);
      expect((q1.table as { name: string }).name).toBe("rl_post_tags");

      expect(tags[0].posts).toHaveLength(1);
    });
  });
});
