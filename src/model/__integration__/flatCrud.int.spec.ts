import { ModelError } from "@/model/errors/ModelError";
import type { Repository } from "@/model/Repository";
import { User } from "@/model/__integration__/fixtures/User.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("Repository flat-entity CRUD (integration)", () => {
  const fixture = setupModelFixture();

  function getRepo(): Repository<User> {
    return fixture.getDataSource().getRepository(User);
  }

  function newUserData(overrides: Partial<User> = {}): Partial<User> {
    return {
      email: "alice@example.com",
      displayName: "Alice",
      isActive: true,
      signupCount: 0,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    };
  }

  it("create() returns an instance with no row inserted", async () => {
    const repo = getRepo();
    const built = repo.create(newUserData());
    expect(built).toBeInstanceOf(User);

    const rows = await fixture.rawQuery("SELECT * FROM model_users");
    expect(rows).toHaveLength(0);
  });

  it("insert() persists and returns hydrated instance with generated id", async () => {
    const repo = getRepo();
    const result = await repo.insert(newUserData());

    expect(result).toBeInstanceOf(User);
    expect(typeof result.id).toBe("number");
    expect(result.email).toBe("alice@example.com");
    expect(result.isActive).toBe(true);
  });

  it("findOne by primary key returns equivalent instance", async () => {
    const repo = getRepo();
    const inserted = await repo.insert(newUserData());

    const found = await repo.findOne({ where: { id: inserted.id } });
    expect(found).not.toBeNull();
    expect(found?.email).toBe("alice@example.com");
    expect(found).not.toBe(inserted);
  });

  it("find supports where, orderBy, take", async () => {
    const repo = getRepo();
    await repo.insert(newUserData({ email: "a@x.com", displayName: "A" }));
    await repo.insert(newUserData({ email: "b@x.com", displayName: "B" }));
    await repo.insert(newUserData({ email: "c@x.com", displayName: "C", isActive: false }));

    const list = await repo.find({
      where: { isActive: true },
      orderBy: [{ displayName: "desc" }],
      take: 5,
    });
    expect(list.map((u) => u.displayName)).toEqual(["B", "A"]);
  });

  it("count returns matching row count", async () => {
    const repo = getRepo();
    await repo.insert(newUserData({ email: "a@x.com" }));
    await repo.insert(newUserData({ email: "b@x.com" }));

    expect(await repo.count()).toBe(2);
    expect(await repo.count({ where: { email: "a@x.com" } })).toBe(1);
    expect(await repo.count({ where: { email: "missing@x.com" } })).toBe(0);
  });

  it("exists returns true/false", async () => {
    const repo = getRepo();
    const inserted = await repo.insert(newUserData());
    expect(await repo.exists({ id: inserted.id })).toBe(true);
    expect(await repo.exists({ id: 99999 })).toBe(false);
  });

  it("update returns affected count and reflects in subsequent findOne", async () => {
    const repo = getRepo();
    const inserted = await repo.insert(newUserData());

    const affected = await repo.update({ id: inserted.id }, { displayName: "Alice Updated" });
    expect(affected).toBe(1);

    const fresh = await repo.findOne({ where: { id: inserted.id } });
    expect(fresh?.displayName).toBe("Alice Updated");
  });

  it("update with no recognized columns throws EMPTY_UPDATE", async () => {
    const repo = getRepo();
    const inserted = await repo.insert(newUserData());
    await expect(repo.update({ id: inserted.id }, {})).rejects.toBeInstanceOf(ModelError);
  });

  it("delete returns affected count and removes the row", async () => {
    const repo = getRepo();
    const inserted = await repo.insert(newUserData());

    expect(await repo.delete({ id: inserted.id })).toBe(1);
    expect(await repo.findOne({ where: { id: inserted.id } })).toBeNull();
  });

  it("save with missing PK takes INSERT path and assigns id", async () => {
    const repo = getRepo();
    const entity = repo.create(newUserData({ email: "save-insert@x.com" }));
    const result = await repo.save(entity);

    expect(typeof result.id).toBe("number");
    expect(entity.id).toBe(result.id);
    expect(result).toBe(entity);
  });

  it("save with PK present takes UPDATE path", async () => {
    const repo = getRepo();
    const inserted = await repo.insert(newUserData());

    inserted.displayName = "Renamed";
    await repo.save(inserted);

    const fresh = await repo.findOne({ where: { id: inserted.id } });
    expect(fresh?.displayName).toBe("Renamed");
  });

  it("two findOne calls for the same row return distinct objects", async () => {
    const repo = getRepo();
    const inserted = await repo.insert(newUserData());
    const [a, b] = await Promise.all([
      repo.findOne({ where: { id: inserted.id } }),
      repo.findOne({ where: { id: inserted.id } }),
    ]);
    expect(a).not.toBe(b);
    expect(a?.id).toBe(b?.id);
  });

  it("operator where: $like, $in, $or, $not", async () => {
    const repo = getRepo();
    await repo.insert(newUserData({ email: "alpha@x.com", displayName: "Alpha" }));
    await repo.insert(newUserData({ email: "beta@x.com", displayName: "Beta" }));
    await repo.insert(newUserData({ email: "gamma@x.com", displayName: "Gamma" }));

    const likeMatches = await repo.find({ where: { displayName: { $like: "A%" } } });
    expect(likeMatches.map((u) => u.displayName)).toEqual(["Alpha"]);

    const inMatches = await repo.find({
      where: { displayName: { $in: ["Alpha", "Gamma"] } },
      orderBy: [{ displayName: "asc" }],
    });
    expect(inMatches.map((u) => u.displayName)).toEqual(["Alpha", "Gamma"]);

    const orMatches = await repo.find({
      where: { $or: [{ displayName: "Alpha" }, { displayName: "Beta" }] },
      orderBy: [{ displayName: "asc" }],
    });
    expect(orMatches.map((u) => u.displayName)).toEqual(["Alpha", "Beta"]);

    const notMatches = await repo.find({
      where: { $not: { displayName: "Beta" } },
      orderBy: [{ displayName: "asc" }],
    });
    expect(notMatches.map((u) => u.displayName)).toEqual(["Alpha", "Gamma"]);
  });

  it("nullable column where: null shorthand and $isNull", async () => {
    const repo = getRepo();
    await repo.insert(newUserData({ email: "no-login@x.com", lastLoginAt: null }));
    await repo.insert(newUserData({ email: "yes-login@x.com", lastLoginAt: new Date("2026-04-01T00:00:00Z") }));

    const nulls = await repo.find({ where: { lastLoginAt: null } });
    expect(nulls).toHaveLength(1);
    expect(nulls[0].email).toBe("no-login@x.com");

    const notNulls = await repo.find({ where: { lastLoginAt: { $isNull: false } } });
    expect(notNulls).toHaveLength(1);
    expect(notNulls[0].email).toBe("yes-login@x.com");
  });

  it("repo.query() raw SQL escape hatch", async () => {
    const repo = getRepo();
    await repo.insert(newUserData({ email: "a@x.com" }));

    const rows = await repo.query<{ c: number }>("SELECT count(*)::int AS c FROM model_users", []);
    expect(rows[0].c).toBe(1);
  });
});
