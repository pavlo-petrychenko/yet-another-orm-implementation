import { Post } from "@/model/__integration__/fixtures/Post.entity";
import { Tag } from "@/model/__integration__/fixtures/Tag.entity";
import { setupModelFixture } from "@/model/__integration__/fixtures/setup";

describe("include ManyToMany (integration)", () => {
  const fixture = setupModelFixture();

  it("owning side: Post.find({ include: { tags: true } }) populates tags arrays", async () => {
    const ds = fixture.getDataSource();
    const postRepo = ds.getRepository(Post);
    const tagRepo = ds.getRepository(Tag);

    const t1 = await tagRepo.insert({ name: "t1" });
    const t2 = await tagRepo.insert({ name: "t2" });
    const t3 = await tagRepo.insert({ name: "t3" });

    const p1 = await postRepo.insert({ title: "p1" });
    const p2 = await postRepo.insert({ title: "p2" });
    const p3 = await postRepo.insert({ title: "p3" });

    await fixture.rawQuery(
      `INSERT INTO model_post_tags (post_id, tag_id) VALUES ($1,$2),($3,$4),($5,$6),($7,$8)`,
      [p1.id, t1.id, p1.id, t2.id, p2.id, t1.id, p3.id, t3.id],
    );

    const posts = await postRepo.find({
      include: { tags: true },
      orderBy: [{ title: "asc" }],
    });

    expect(posts).toHaveLength(3);
    const byTitle = new Map(posts.map((p) => [p.title, p]));
    expect(byTitle.get("p1")?.tags).toHaveLength(2);
    expect(byTitle.get("p2")?.tags).toHaveLength(1);
    expect(byTitle.get("p3")?.tags).toHaveLength(1);

    // Shared tag t1 appears on multiple posts. Within a single batched M2M load,
    // identical target rows are hydrated once and shared across parents' arrays.
    const p1Tag1 = byTitle.get("p1")?.tags.find((t) => t.name === "t1");
    const p2Tag1 = byTitle.get("p2")?.tags.find((t) => t.name === "t1");
    expect(p1Tag1?.id).toBe(t1.id);
    expect(p2Tag1?.id).toBe(t1.id);
    expect(p1Tag1).toBe(p2Tag1);
  });

  it("inverse side: Tag.find({ include: { posts: true } }) populates posts arrays", async () => {
    const ds = fixture.getDataSource();
    const postRepo = ds.getRepository(Post);
    const tagRepo = ds.getRepository(Tag);

    const t = await tagRepo.insert({ name: "shared" });
    const p1 = await postRepo.insert({ title: "p1" });
    const p2 = await postRepo.insert({ title: "p2" });

    await fixture.rawQuery(
      `INSERT INTO model_post_tags (post_id, tag_id) VALUES ($1,$2),($3,$4)`,
      [p1.id, t.id, p2.id, t.id],
    );

    const tags = await tagRepo.find({ include: { posts: true } });

    expect(tags).toHaveLength(1);
    expect(tags[0].posts).toHaveLength(2);
    const titles = tags[0].posts.map((p) => p.title).sort();
    expect(titles).toEqual(["p1", "p2"]);
  });
});
