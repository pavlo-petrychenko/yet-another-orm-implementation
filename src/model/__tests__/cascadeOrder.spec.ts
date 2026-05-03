import { Column } from "@/decorators/Column.decorator";
import { Entity } from "@/decorators/Entity.decorator";
import { ManyToOne } from "@/decorators/relations/ManyToOne.decorator";
import { OneToMany } from "@/decorators/relations/OneToMany.decorator";
import { OneToOne } from "@/decorators/relations/OneToOne.decorator";
import { ManyToMany } from "@/decorators/relations/ManyToMany.decorator";
import { PrimaryKey } from "@/decorators/PrimaryKey.decorator";
import { DBType } from "@/drivers/types/DBType";
import type { PostgresDriverConfig } from "@/drivers/types/DriverConfig";
import { DataSource } from "@/model/DataSource";
import type { Relation } from "@/model/types/Relation";
import { buildCascadePlan } from "@/model/internal/cascade/topoSort";

const fakePgConfig: PostgresDriverConfig = {
  type: DBType.POSTGRES,
  host: "x",
  port: 1,
  user: "u",
  password: "p",
  database: "d",
};

@Entity({ name: "co_users" })
class CoUser {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public name!: string;

  @OneToMany(() => CoOrder, { inverseSide: "user", cascade: true })
  public orders!: Relation<CoOrder[]>;

  @OneToOne(() => CoProfile, { inverseSide: "user", cascade: true })
  public profile!: Relation<CoProfile> | undefined;
}

@Entity({ name: "co_orders" })
class CoOrder {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "string" })
  public total!: string;

  @ManyToOne(() => CoUser, { joinColumn: { name: "user_id" }, inverseSide: "orders" })
  public user!: Relation<CoUser>;

  @OneToMany(() => CoItem, { inverseSide: "order", cascade: true })
  public items!: Relation<CoItem[]>;
}

@Entity({ name: "co_items" })
class CoItem {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "order_id" })
  public orderId!: number;

  @Column({ type: "integer" })
  public qty!: number;

  @ManyToOne(() => CoOrder, { joinColumn: { name: "order_id" }, inverseSide: "items" })
  public order!: Relation<CoOrder>;
}

@Entity({ name: "co_profiles" })
class CoProfile {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "user_id" })
  public userId!: number;

  @Column({ type: "string" })
  public bio!: string;

  @OneToOne(() => CoUser, { joinColumn: { name: "user_id" }, inverseSide: "profile" })
  public user!: Relation<CoUser>;
}

@Entity({ name: "co_posts" })
class CoPost {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public title!: string;

  @ManyToMany(() => CoTag, {
    joinTable: {
      name: "co_post_tags",
      joinColumn: { name: "post_id" },
      inverseJoinColumn: { name: "tag_id" },
    },
    inverseSide: "posts",
    cascade: true,
  })
  public tags!: Relation<CoTag[]>;
}

@Entity({ name: "co_tags" })
class CoTag {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "string" })
  public label!: string;

  @ManyToMany(() => CoPost, { inverseSide: "tags" })
  public posts!: Relation<CoPost[]>;
}

@Entity({ name: "co_a" })
class CoA {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "b_id", nullable: true })
  public bId!: number | null;

  @ManyToOne(() => CoB, { joinColumn: { name: "b_id" }, cascade: true, nullable: true })
  public b!: Relation<CoB> | undefined;
}

@Entity({ name: "co_b" })
class CoB {
  @PrimaryKey({ type: "integer" })
  public id!: number;

  @Column({ type: "integer", name: "a_id", nullable: true })
  public aId!: number | null;

  @ManyToOne(() => CoA, { joinColumn: { name: "a_id" }, cascade: true, nullable: true })
  public a!: Relation<CoA> | undefined;
}

function makeDs(): DataSource {
  const ds = new DataSource({ driver: fakePgConfig });
  Object.defineProperty(ds, "state", { value: "connected", writable: true, configurable: true });
  return ds;
}

describe("cascade topoSort", () => {
  it("orders parent → children for O2M", () => {
    const ds = makeDs();
    const userMeta = ds.getMetadata(CoUser);

    const user = Object.assign(new CoUser(), {
      name: "U",
      orders: [
        Object.assign(new CoOrder(), { total: "10.00", items: [] }),
        Object.assign(new CoOrder(), { total: "20.00", items: [] }),
      ],
    });

    const plan = buildCascadePlan(user, userMeta, ds);
    const classes = plan.order.map((n) => n.metadata.className);
    expect(classes[0]).toBe("CoUser");
    expect(classes.slice(1).every((c) => c === "CoOrder")).toBe(true);
    expect(plan.order).toHaveLength(3);
  });

  it("orders deeply: User → Order → Item", () => {
    const ds = makeDs();
    const userMeta = ds.getMetadata(CoUser);

    const item = Object.assign(new CoItem(), { qty: 3 });
    const order = Object.assign(new CoOrder(), { total: "1.00", items: [item] });
    const user = Object.assign(new CoUser(), { name: "U", orders: [order] });

    const plan = buildCascadePlan(user, userMeta, ds);
    const classes = plan.order.map((n) => n.metadata.className);
    expect(classes).toEqual(["CoUser", "CoOrder", "CoItem"]);
  });

  it("M2M: queues join-table link rows and persists both endpoints", () => {
    const ds = makeDs();
    const postMeta = ds.getMetadata(CoPost);

    const tag1 = Object.assign(new CoTag(), { label: "x" });
    const tag2 = Object.assign(new CoTag(), { label: "y" });
    const post = Object.assign(new CoPost(), { title: "p", tags: [tag1, tag2] });

    const plan = buildCascadePlan(post, postMeta, ds);
    expect(plan.order.map((n) => n.metadata.className).sort()).toEqual(["CoPost", "CoTag", "CoTag"]);
    expect(plan.m2mLinks).toHaveLength(2);
    expect(plan.m2mLinks[0].joinTable).toBe("co_post_tags");
    expect(plan.m2mLinks[0].joinColumn).toBe("post_id");
    expect(plan.m2mLinks[0].inverseJoinColumn).toBe("tag_id");
  });

  it("cycle in cascade graph throws CASCADE_CYCLE", () => {
    const ds = makeDs();
    const aMeta = ds.getMetadata(CoA);

    const a = new CoA();
    const b = new CoB();
    Object.assign(a, { b });
    Object.assign(b, { a });

    expect(() => buildCascadePlan(a, aMeta, ds)).toThrow(/CASCADE_CYCLE|cycle/i);
  });
});
